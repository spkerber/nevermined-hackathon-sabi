import MWDATCore
import SwiftUI
import UIKit

struct StreamSessionView: View {
  let wearables: WearablesInterface
  @ObservedObject private var wearablesViewModel: WearablesViewModel
  @StateObject private var viewModel: StreamSessionViewModel
  @StateObject private var geminiVM = GeminiSessionViewModel()
  @StateObject private var apiClient = SabiAPIClient()

  let jobId: String
  let question: String
  var onCancelled: (() -> Void)?

  init(wearables: WearablesInterface, wearablesVM: WearablesViewModel, jobId: String, question: String, onCancelled: (() -> Void)? = nil) {
    self.wearables = wearables
    self.wearablesViewModel = wearablesVM
    self.jobId = jobId
    self.question = question
    self.onCancelled = onCancelled
    self._viewModel = StateObject(wrappedValue: StreamSessionViewModel(wearables: wearables))
  }

  var body: some View {
    ZStack {
      if viewModel.isStreaming {
        StreamView(viewModel: viewModel, wearablesVM: wearablesViewModel, geminiVM: geminiVM, onCancelled: onCancelled)
      } else {
        NonStreamView(viewModel: viewModel, wearablesVM: wearablesViewModel)
      }
    }
    .task {
      viewModel.geminiSessionVM = geminiVM
      geminiVM.streamingMode = viewModel.streamingMode

      // Configure the verification session with the accepted job
      geminiVM.verificationSession.configure(jobId: jobId, question: question)
    }
    .onChange(of: viewModel.streamingMode) { _, newMode in
      geminiVM.streamingMode = newMode
    }
    .onChange(of: viewModel.isStreaming) { _, isStreaming in
      // Auto-start Gemini verification when streaming begins
      if isStreaming && !geminiVM.isGeminiActive {
        Task {
          await geminiVM.startSession()
        }
      }
    }
    .onChange(of: geminiVM.wasInterrupted) { _, interrupted in
      if interrupted {
        // Audio was interrupted (phone call, etc.) — cancel job on backend
        Task {
          await viewModel.stopSession()
          try? await apiClient.cancelJob(jobId: jobId)
          onCancelled?()
        }
      }
    }
    .onAppear {
      UIApplication.shared.isIdleTimerDisabled = true
    }
    .onDisappear {
      UIApplication.shared.isIdleTimerDisabled = false
    }
    .alert("Error", isPresented: $viewModel.showError) {
      Button("OK") {
        viewModel.dismissError()
      }
    } message: {
      Text(viewModel.errorMessage)
    }
  }
}
