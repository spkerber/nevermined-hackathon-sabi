import Foundation
import UIKit

struct CapturedFrame: Identifiable {
  let id: UUID
  let timestamp: Date
  let image: UIImage
}

@MainActor
class VerificationSessionManager: ObservableObject {
  @Published var isActive: Bool = false
  @Published var capturedFrames: [CapturedFrame] = []
  @Published var sessionStartTime: Date?
  @Published var jobId: String?
  @Published var question: String?
  @Published var answer: String?

  private let frameCaptureInterval: TimeInterval = 5.0
  private var lastFrameCaptureTime: Date = .distantPast

  func configure(jobId: String, question: String) {
    self.jobId = jobId
    self.question = question
  }

  func startSession() {
    isActive = true
    capturedFrames = []
    sessionStartTime = Date()
    lastFrameCaptureTime = .distantPast
    answer = nil
    NSLog("[Verification] Session started for job %@", jobId ?? "unknown")
  }

  func endSession(answer: String) {
    self.answer = answer
    isActive = false
    NSLog("[Verification] Session ended with %d frames, answer: %@",
          capturedFrames.count, answer)
  }

  func captureFrameIfNeeded(image: UIImage) {
    guard isActive else { return }
    let now = Date()
    guard now.timeIntervalSince(lastFrameCaptureTime) >= frameCaptureInterval else { return }
    lastFrameCaptureTime = now

    let frame = CapturedFrame(
      id: UUID(),
      timestamp: now,
      image: image
    )
    capturedFrames.append(frame)
    NSLog("[Verification] Captured frame %d", capturedFrames.count)
  }

  func reset() {
    isActive = false
    capturedFrames = []
    sessionStartTime = nil
    jobId = nil
    question = nil
    answer = nil
  }
}
