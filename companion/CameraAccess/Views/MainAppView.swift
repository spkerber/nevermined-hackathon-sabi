import MWDATCore
import SwiftUI

struct MainAppView: View {
  let wearables: WearablesInterface
  @ObservedObject private var viewModel: WearablesViewModel
  @State private var acceptedJobId: String?
  @State private var acceptedQuestion: String?

  init(wearables: WearablesInterface, viewModel: WearablesViewModel) {
    self.wearables = wearables
    self.viewModel = viewModel
  }

  var body: some View {
    if viewModel.registrationState == .registered || viewModel.hasMockDevice || viewModel.skipToIPhoneMode {
      if let jobId = acceptedJobId, let question = acceptedQuestion {
        // Job accepted -- go to streaming + verification
        StreamSessionView(
          wearables: wearables,
          wearablesVM: viewModel,
          jobId: jobId,
          question: question,
          onCancelled: {
            acceptedJobId = nil
            acceptedQuestion = nil
          }
        )
      } else {
        // Glasses connected but no job yet -- show job picker
        VerificationJobView { jobId, question in
          acceptedJobId = jobId
          acceptedQuestion = question
        }
      }
    } else {
      HomeScreenView(viewModel: viewModel)
    }
  }
}
