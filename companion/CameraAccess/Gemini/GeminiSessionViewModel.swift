import Foundation
import SwiftUI

@MainActor
class GeminiSessionViewModel: ObservableObject {
  @Published var isGeminiActive: Bool = false
  @Published var connectionState: GeminiConnectionState = .disconnected
  @Published var isModelSpeaking: Bool = false
  @Published var errorMessage: String?
  @Published var userTranscript: String = ""
  @Published var aiTranscript: String = ""
  @Published var wasInterrupted: Bool = false
  /// Full conversation log accumulated across all turns
  @Published var fullTranscript: String = ""
  /// Tracks whether the last transcript entry was from the user (to coalesce fragments)
  private var lastTranscriptSpeaker: String = ""

  let verificationSession = VerificationSessionManager()

  private let geminiService = GeminiLiveService()
  private var verificationToolHandler: VerificationToolHandler?
  private let audioManager = AudioManager()
  private var lastVideoFrameTime: Date = .distantPast
  private var stateObservation: Task<Void, Never>?

  var streamingMode: StreamingMode = .glasses

  func startSession() async {
    guard !isGeminiActive else { return }

    guard GeminiConfig.isConfigured else {
      errorMessage = "Gemini API key not configured. Add your key in Settings."
      return
    }

    guard AudioManager.isAudioAvailable else {
      errorMessage = "Audio is unavailable — another app (phone call, music) is using it. End the other audio session and try again."
      return
    }

    isGeminiActive = true
    wasInterrupted = false
    fullTranscript = ""
    lastTranscriptSpeaker = ""
    verificationSession.startSession()

    // Handle audio interruptions (e.g. incoming phone call)
    audioManager.onInterruption = { [weak self] event in
      guard let self else { return }
      Task { @MainActor in
        switch event {
        case .began(let reason):
          self.wasInterrupted = true
          self.errorMessage = "Session interrupted: \(reason). The verification was cancelled."
          self.stopSession()
        case .ended:
          break  // Session already stopped, user needs to re-accept
        }
      }
    }

    // Wire audio callbacks
    audioManager.onAudioCaptured = { [weak self] data in
      guard let self else { return }
      Task { @MainActor in
        if self.streamingMode == .iPhone && self.geminiService.isModelSpeaking { return }
        self.geminiService.sendAudio(data: data)
      }
    }

    geminiService.onAudioReceived = { [weak self] data in
      self?.audioManager.playAudio(data: data)
    }

    geminiService.onInterrupted = { [weak self] in
      self?.audioManager.stopPlayback()
    }

    geminiService.onTurnComplete = { [weak self] in
      guard let self else { return }
      Task { @MainActor in
        // Log completed AI turn to full transcript
        if !self.aiTranscript.isEmpty {
          if self.lastTranscriptSpeaker == "AI" {
            self.fullTranscript += self.aiTranscript
          } else {
            self.fullTranscript += "\nAI: \(self.aiTranscript)"
          }
          self.lastTranscriptSpeaker = "AI"
        }
        self.fullTranscript += "\n"
        self.userTranscript = ""
      }
    }

    geminiService.onInputTranscription = { [weak self] text in
      guard let self else { return }
      Task { @MainActor in
        // When user starts speaking, log any pending AI transcript
        if self.userTranscript.isEmpty && !self.aiTranscript.isEmpty {
          self.aiTranscript = ""
        }
        self.userTranscript += text
        // Coalesce consecutive user fragments into one "User:" line
        if self.lastTranscriptSpeaker == "User" {
          self.fullTranscript += text
        } else {
          self.fullTranscript += "\nUser: \(text)"
          self.lastTranscriptSpeaker = "User"
        }
      }
    }

    geminiService.onOutputTranscription = { [weak self] text in
      guard let self else { return }
      Task { @MainActor in
        self.aiTranscript += text
      }
    }

    geminiService.onDisconnected = { [weak self] reason in
      guard let self else { return }
      Task { @MainActor in
        guard self.isGeminiActive else { return }
        self.stopSession()
        self.errorMessage = "Connection lost: \(reason ?? "Unknown error")"
      }
    }

    // Wire verification tool handling
    verificationToolHandler = VerificationToolHandler(session: verificationSession)

    geminiService.onToolCall = { [weak self] toolCall in
      guard let self else { return }
      Task { @MainActor in
        for call in toolCall.functionCalls {
          self.verificationToolHandler?.handleToolCall(call) { [weak self] response in
            self?.geminiService.sendToolResponse(response)
          }
        }
      }
    }

    geminiService.onToolCallCancellation = { cancellation in
      NSLog("[Verification] Tool call cancellation: %@", cancellation.ids.joined(separator: ", "))
    }

    // Observe service state
    stateObservation = Task { [weak self] in
      guard let self else { return }
      while !Task.isCancelled {
        try? await Task.sleep(nanoseconds: 100_000_000)
        guard !Task.isCancelled else { break }
        self.connectionState = self.geminiService.connectionState
        self.isModelSpeaking = self.geminiService.isModelSpeaking
      }
    }

    // Setup audio
    do {
      try audioManager.setupAudioSession(useIPhoneMode: streamingMode == .iPhone)
    } catch {
      errorMessage = "Audio setup failed: \(error.localizedDescription)"
      isGeminiActive = false
      return
    }

    // Connect to Gemini
    let setupOk = await geminiService.connect()

    if !setupOk {
      let msg: String
      if case .error(let err) = geminiService.connectionState {
        msg = err
      } else {
        msg = "Failed to connect to Gemini"
      }
      errorMessage = msg
      geminiService.disconnect()
      stateObservation?.cancel()
      stateObservation = nil
      isGeminiActive = false
      connectionState = .disconnected
      return
    }

    // Send the verification question — remind Gemini to stay passive
    if let question = verificationSession.question {
      geminiService.sendTextMessage("The verification question is: \(question). Wait for the verifier to speak — do not describe what you see or try to answer on your own.")
    }

    // Start mic capture
    do {
      try audioManager.startCapture()
    } catch {
      errorMessage = "Mic capture failed: \(error.localizedDescription)"
      geminiService.disconnect()
      stateObservation?.cancel()
      stateObservation = nil
      isGeminiActive = false
      connectionState = .disconnected
      return
    }
  }

  func stopSession() {
    verificationToolHandler = nil
    audioManager.onInterruption = nil
    audioManager.stopCapture()
    geminiService.disconnect()
    stateObservation?.cancel()
    stateObservation = nil
    isGeminiActive = false
    connectionState = .disconnected
    isModelSpeaking = false
    userTranscript = ""
    aiTranscript = ""
  }

  /// Stop without triggering error alerts — used during intentional completion flow
  func stopSessionQuietly() {
    geminiService.onDisconnected = nil
    stopSession()
  }

  func sendVideoFrameIfThrottled(image: UIImage) {
    guard isGeminiActive, connectionState == .ready else { return }
    let now = Date()
    guard now.timeIntervalSince(lastVideoFrameTime) >= GeminiConfig.videoFrameInterval else { return }
    lastVideoFrameTime = now
    geminiService.sendVideoFrame(image: image)

    // Capture frame for verification evidence
    verificationSession.captureFrameIfNeeded(image: image)
  }
}
