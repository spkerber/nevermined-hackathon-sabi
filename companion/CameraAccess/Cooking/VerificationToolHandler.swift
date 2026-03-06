import Foundation

@MainActor
class VerificationToolHandler {
  private let session: VerificationSessionManager

  init(session: VerificationSessionManager) {
    self.session = session
  }

  func handleToolCall(
    _ call: GeminiFunctionCall,
    sendResponse: @escaping ([String: Any]) -> Void
  ) {
    let callId = call.id
    let callName = call.name

    NSLog("[VerificationTool] %@ (id: %@) args: %@", callName, callId, String(describing: call.args))

    switch callName {
    case "log_observation":
      handleLogObservation(call: call, sendResponse: sendResponse)
    case "provide_answer":
      handleProvideAnswer(call: call, sendResponse: sendResponse)
    case "ask_clarification":
      handleAskClarification(call: call, sendResponse: sendResponse)
    default:
      NSLog("[VerificationTool] Unknown tool: %@", callName)
      let response = buildToolResponse(callId: callId, name: callName, result: ["error": "Unknown tool"])
      sendResponse(response)
    }
  }

  private func handleLogObservation(
    call: GeminiFunctionCall,
    sendResponse: @escaping ([String: Any]) -> Void
  ) {
    let detail = call.args["detail"] as? String ?? ""
    NSLog("[VerificationTool] Observation: %@", detail)

    let response = buildToolResponse(
      callId: call.id,
      name: call.name,
      result: ["result": "Logged: \(detail)"]
    )
    sendResponse(response)
  }

  private func handleProvideAnswer(
    call: GeminiFunctionCall,
    sendResponse: @escaping ([String: Any]) -> Void
  ) {
    let answer = call.args["answer"] as? String ?? ""
    NSLog("[VerificationTool] Answer provided: %@", answer)

    // Store the answer on the session so it's available when completing
    session.answer = answer

    let response = buildToolResponse(
      callId: call.id,
      name: call.name,
      result: ["result": "Answer recorded: \(answer). Tell the user you've recorded their answer and they can tap Complete whenever ready."]
    )
    sendResponse(response)
  }

  private func handleAskClarification(
    call: GeminiFunctionCall,
    sendResponse: @escaping ([String: Any]) -> Void
  ) {
    let question = call.args["question"] as? String ?? ""
    let context = call.args["context"] as? String ?? ""

    NSLog("[VerificationTool] Clarification requested: %@", question)

    let response = buildToolResponse(
      callId: call.id,
      name: call.name,
      result: ["result": "Ask the user: \(question). Context: \(context)."]
    )
    sendResponse(response)
  }

  private func buildToolResponse(
    callId: String,
    name: String,
    result: [String: Any]
  ) -> [String: Any] {
    return [
      "toolResponse": [
        "functionResponses": [
          [
            "id": callId,
            "name": name,
            "response": result
          ]
        ]
      ]
    ]
  }
}
