import MWDATCore
import SwiftUI

struct StreamView: View {
  @ObservedObject var viewModel: StreamSessionViewModel
  @ObservedObject var wearablesVM: WearablesViewModel
  @ObservedObject var geminiVM: GeminiSessionViewModel
  var onCancelled: (() -> Void)?
  @State private var showVerificationComplete = false
  @State private var isCancelling = false
  @State private var isUploading = false
  @State private var uploadStatus = ""
  @State private var uploadError: String?
  @StateObject private var apiClient = SabiAPIClient()

  var body: some View {
    ZStack {
      Color.black
        .edgesIgnoringSafeArea(.all)

      // Video backdrop
      if let videoFrame = viewModel.currentVideoFrame, viewModel.hasReceivedFirstFrame {
        GeometryReader { geometry in
          Image(uiImage: videoFrame)
            .resizable()
            .aspectRatio(contentMode: .fill)
            .frame(width: geometry.size.width, height: geometry.size.height)
            .clipped()
        }
        .edgesIgnoringSafeArea(.all)
      } else {
        VStack(spacing: 12) {
          ProgressView()
            .scaleEffect(1.5)
            .foregroundColor(.white)
          Text("Starting camera...")
            .font(.system(size: 14))
            .foregroundColor(.white.opacity(0.6))
        }
      }

      // Verification overlay (always shown since verification auto-starts)
      VStack(spacing: 0) {
        // Question banner at top
        if let question = geminiVM.verificationSession.question {
          HStack(spacing: 8) {
            Image(systemName: "questionmark.circle.fill")
              .foregroundColor(.yellow)
              .font(.system(size: 16))
            Text(question)
              .font(.system(size: 15, weight: .medium))
              .foregroundColor(.white)
              .lineLimit(3)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(14)
          .background(Color.black.opacity(0.75))
          .cornerRadius(12)
          .padding(.bottom, 8)
        }

        // Reconnect banner when Gemini disconnected
        if !geminiVM.isGeminiActive && geminiVM.errorMessage == nil {
          Button {
            Task { await geminiVM.startSession() }
          } label: {
            HStack(spacing: 8) {
              Image(systemName: "arrow.clockwise")
                .font(.system(size: 14, weight: .semibold))
              Text("Reconnect AI")
                .font(.system(size: 14, weight: .semibold))
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(Color.orange.opacity(0.85))
            .cornerRadius(10)
          }
          .padding(.bottom, 8)
        }

        // Status row
        HStack(spacing: 8) {
          if geminiVM.isGeminiActive {
            GeminiStatusBar(geminiVM: geminiVM)
          }

          // Frame counter
          HStack(spacing: 4) {
            Image(systemName: "camera.fill")
              .foregroundColor(.green)
              .font(.system(size: 11))
            Text("\(geminiVM.verificationSession.capturedFrames.count)")
              .font(.system(size: 12, weight: .medium, design: .monospaced))
              .foregroundColor(.white)
          }
          .padding(.horizontal, 10)
          .padding(.vertical, 5)
          .background(Color.black.opacity(0.5))
          .cornerRadius(12)

          Spacer()
        }

        Spacer()

        // Transcripts
        VStack(spacing: 8) {
          if !geminiVM.userTranscript.isEmpty || !geminiVM.aiTranscript.isEmpty {
            TranscriptView(
              userText: geminiVM.userTranscript,
              aiText: geminiVM.aiTranscript
            )
          }

          if geminiVM.isModelSpeaking {
            HStack(spacing: 8) {
              Image(systemName: "speaker.wave.2.fill")
                .foregroundColor(.white)
                .font(.system(size: 14))
              SpeakingIndicator()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color.black.opacity(0.5))
            .cornerRadius(20)
          }
        }
        .padding(.bottom, 16)

        // Bottom controls
        HStack(spacing: 12) {
          // Cancel
          Button {
            Task { await cancelVerification() }
          } label: {
            HStack(spacing: 6) {
              if isCancelling {
                ProgressView()
                  .tint(.white)
                  .scaleEffect(0.8)
              }
              Text(isCancelling ? "Cancelling..." : "Cancel")
                .font(.system(size: 15, weight: .semibold))
            }
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 14)
            .background(Color.red.opacity(0.8))
            .cornerRadius(12)
          }
          .disabled(isCancelling)

          Spacer()

          // Complete Verification
          Button {
            Task { await completeVerification() }
          } label: {
            HStack(spacing: 6) {
              if isUploading {
                ProgressView()
                  .tint(.black)
                  .scaleEffect(0.8)
              }
              Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 16))
              Text(isUploading ? uploadStatus : "Complete")
                .font(.system(size: 15, weight: .bold))
            }
            .foregroundColor(.black)
            .padding(.horizontal, 24)
            .padding(.vertical, 14)
            .background(geminiVM.verificationSession.capturedFrames.isEmpty ? Color.green.opacity(0.4) : Color.green)
            .cornerRadius(12)
          }
          .disabled(isUploading || geminiVM.verificationSession.capturedFrames.isEmpty)
        }
      }
      .padding(.all, 20)

      // Upload overlay
      if isUploading {
        Color.black.opacity(0.4)
          .edgesIgnoringSafeArea(.all)
          .allowsHitTesting(false)
      }
    }
    .onDisappear {
      Task {
        if geminiVM.isGeminiActive { geminiVM.stopSession() }
        if viewModel.streamingStatus != .stopped { await viewModel.stopSession() }
      }
    }
    .sheet(isPresented: $viewModel.showPhotoPreview) {
      if let photo = viewModel.capturedPhoto {
        PhotoPreviewView(photo: photo, onDismiss: { viewModel.dismissPhotoPreview() })
      }
    }
    .alert("Verification Submitted!", isPresented: $showVerificationComplete) {
      Button("OK") {
        showVerificationComplete = false
        onCancelled?()  // Navigate back to job list
      }
    } message: {
      Text("Uploaded \(geminiVM.verificationSession.capturedFrames.count) photos. The requester can now review your verification.")
    }
    .alert("Verification Error", isPresented: Binding(
      get: { geminiVM.errorMessage != nil && !geminiVM.wasInterrupted },
      set: { if !$0 { geminiVM.errorMessage = nil } }
    )) {
      Button("Retry") {
        geminiVM.errorMessage = nil
        Task { await geminiVM.startSession() }
      }
      Button("Dismiss", role: .cancel) { geminiVM.errorMessage = nil }
    } message: {
      Text(geminiVM.errorMessage ?? "")
    }
    .alert("Upload Error", isPresented: Binding(
      get: { uploadError != nil },
      set: { if !$0 { uploadError = nil } }
    )) {
      Button("OK") { uploadError = nil }
    } message: {
      Text(uploadError ?? "")
    }
  }

  private func completeVerification() async {
    let session = geminiVM.verificationSession
    guard let jobId = session.jobId else {
      uploadError = "No job ID"
      return
    }

    // Use the last AI transcript as the answer, or a default
    let answer = session.answer ?? (geminiVM.aiTranscript.isEmpty ? "Verified by visual inspection" : geminiVM.aiTranscript)
    let transcript = geminiVM.fullTranscript
    session.endSession(answer: answer)

    // Stop Gemini cleanly — clear onDisconnected first to prevent spurious error alerts
    geminiVM.stopSessionQuietly()

    isUploading = true
    uploadStatus = "Uploading..."

    do {
      // Upload frames
      let frameCount = session.capturedFrames.count
      uploadStatus = "Photos 0/\(frameCount)"
      try await apiClient.uploadFrames(frames: session.capturedFrames, jobId: jobId) { uploaded in
        Task { @MainActor in
          uploadStatus = "Photos \(uploaded)/\(frameCount)"
        }
      }

      // End session with answer + transcript
      uploadStatus = "Submitting..."
      try await apiClient.endSession(jobId: jobId, answer: answer, transcript: transcript)

      showVerificationComplete = true
    } catch {
      uploadError = error.localizedDescription
    }

    isUploading = false
  }

  private func cancelVerification() async {
    let session = geminiVM.verificationSession
    isCancelling = true

    geminiVM.stopSession()
    await viewModel.stopSession()

    // Tell backend to reset job to connecting
    if let jobId = session.jobId {
      try? await apiClient.cancelJob(jobId: jobId)
    }

    isCancelling = false
    onCancelled?()
  }
}
