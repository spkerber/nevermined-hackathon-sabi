import SwiftUI

struct GeminiStatusBar: View {
  @ObservedObject var geminiVM: GeminiSessionViewModel

  var body: some View {
    HStack(spacing: 8) {
      StatusPill(color: geminiStatusColor, text: geminiStatusText)
      VerificationStatusPill(session: geminiVM.verificationSession)
    }
  }

  private var geminiStatusColor: Color {
    switch geminiVM.connectionState {
    case .ready: return .green
    case .connecting, .settingUp: return .yellow
    case .error: return .red
    case .disconnected: return .gray
    }
  }

  private var geminiStatusText: String {
    switch geminiVM.connectionState {
    case .ready: return "Observing"
    case .connecting, .settingUp: return "Connecting..."
    case .error: return "Error"
    case .disconnected: return "Off"
    }
  }
}

struct VerificationStatusPill: View {
  @ObservedObject var session: VerificationSessionManager

  var body: some View {
    if session.isActive {
      HStack(spacing: 6) {
        Circle()
          .fill(Color.red)
          .frame(width: 8, height: 8)
        Text("\(session.capturedFrames.count) photos")
          .font(.system(size: 12, weight: .medium))
          .foregroundColor(.white)
        Text(formatDuration(sessionDuration()))
          .font(.system(size: 12, design: .monospaced))
          .foregroundColor(.white.opacity(0.7))
      }
      .padding(.horizontal, 12)
      .padding(.vertical, 6)
      .background(Color.black.opacity(0.6))
      .cornerRadius(16)
    }
  }

  private func sessionDuration() -> TimeInterval {
    guard let start = session.sessionStartTime else { return 0 }
    return Date().timeIntervalSince(start)
  }

  private func formatDuration(_ interval: TimeInterval) -> String {
    let mins = Int(interval) / 60
    let secs = Int(interval) % 60
    return String(format: "%d:%02d", mins, secs)
  }
}

struct StatusPill: View {
  let color: Color
  let text: String

  var body: some View {
    HStack(spacing: 6) {
      Circle()
        .fill(color)
        .frame(width: 8, height: 8)
      Text(text)
        .font(.system(size: 12, weight: .medium))
        .foregroundColor(.white)
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 6)
    .background(Color.black.opacity(0.6))
    .cornerRadius(16)
  }
}

struct TranscriptView: View {
  let userText: String
  let aiText: String

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      if !userText.isEmpty {
        Text(userText)
          .font(.system(size: 14))
          .foregroundColor(.white.opacity(0.7))
      }
      if !aiText.isEmpty {
        Text(aiText)
          .font(.system(size: 16, weight: .medium))
          .foregroundColor(.white)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 16)
    .padding(.vertical, 10)
    .background(Color.black.opacity(0.6))
    .cornerRadius(12)
  }
}

struct SpeakingIndicator: View {
  @State private var animating = false

  var body: some View {
    HStack(spacing: 3) {
      ForEach(0..<4, id: \.self) { index in
        RoundedRectangle(cornerRadius: 1.5)
          .fill(Color.white)
          .frame(width: 3, height: animating ? CGFloat.random(in: 8...20) : 6)
          .animation(
            .easeInOut(duration: 0.3)
              .repeatForever(autoreverses: true)
              .delay(Double(index) * 0.1),
            value: animating
          )
      }
    }
    .onAppear { animating = true }
    .onDisappear { animating = false }
  }
}
