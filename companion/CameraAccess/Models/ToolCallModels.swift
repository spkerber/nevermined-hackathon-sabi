import Foundation

// MARK: - Gemini Tool Call (parsed from server JSON)

struct GeminiFunctionCall {
  let id: String
  let name: String
  let args: [String: Any]
}

struct GeminiToolCall {
  let functionCalls: [GeminiFunctionCall]

  init?(json: [String: Any]) {
    guard let toolCall = json["toolCall"] as? [String: Any],
          let calls = toolCall["functionCalls"] as? [[String: Any]] else {
      return nil
    }
    self.functionCalls = calls.compactMap { call in
      guard let id = call["id"] as? String,
            let name = call["name"] as? String else { return nil }
      let args = call["args"] as? [String: Any] ?? [:]
      return GeminiFunctionCall(id: id, name: name, args: args)
    }
  }
}

// MARK: - Gemini Tool Call Cancellation

struct GeminiToolCallCancellation {
  let ids: [String]

  init?(json: [String: Any]) {
    guard let cancellation = json["toolCallCancellation"] as? [String: Any],
          let ids = cancellation["ids"] as? [String] else {
      return nil
    }
    self.ids = ids
  }
}

// MARK: - Tool Declarations (for Gemini setup message)

enum ToolDeclarations {

  static func allDeclarations() -> [[String: Any]] {
    return [logObservation, provideAnswer, askClarification]
  }

  static let logObservation: [String: Any] = [
    "name": "log_observation",
    "description": "Log something relevant to the verification question. Use this to record what you observe through the camera that helps answer the question.",
    "parameters": [
      "type": "object",
      "properties": [
        "detail": [
          "type": "string",
          "description": "What you observed that is relevant to the verification question. Be specific and factual."
        ]
      ],
      "required": ["detail"]
    ] as [String: Any]
  ]

  static let provideAnswer: [String: Any] = [
    "name": "provide_answer",
    "description": "Provide the answer to the verification question. Use this when you have observed enough evidence to confidently answer. Be specific and factual.",
    "parameters": [
      "type": "object",
      "properties": [
        "answer": [
          "type": "string",
          "description": "The answer to the verification question, based on what you observed. Be specific: '4 Fanta cans' not 'some drinks'."
        ]
      ],
      "required": ["answer"]
    ] as [String: Any]
  ]

  static let askClarification: [String: Any] = [
    "name": "ask_clarification",
    "description": "Ask the verifier to look at something specific or clarify something. Use this when you need them to adjust their view or when something is unclear.",
    "parameters": [
      "type": "object",
      "properties": [
        "question": [
          "type": "string",
          "description": "What you need the verifier to do or clarify. Keep it brief and conversational."
        ],
        "context": [
          "type": "string",
          "description": "What prompted this request (e.g. 'the label is partially obscured', 'need to see the other side')"
        ]
      ],
      "required": ["question", "context"]
    ] as [String: Any]
  ]
}
