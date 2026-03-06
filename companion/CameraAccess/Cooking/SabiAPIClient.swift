import Foundation
import UIKit

struct VerificationJobResponse: Codable {
  let id: String
  let question: String
  let status: String
  let target_lat: Double
  let target_lng: Double
  let requester_id: String
  let verifier_id: String?
  let answer: String?
  let created_at: Double
  let updated_at: Double
}

struct AvailableJob: Codable, Identifiable {
  let id: String
  let question: String
  let category: String
  let targetLat: Double
  let targetLng: Double
  let status: String
  let payout: Double
}

struct AvailableJobsResponse: Codable {
  let jobs: [AvailableJob]
}

struct SignupResponse: Codable {
  let apiKey: String
  let userId: String
}

struct JobStatusResponse: Codable {
  let status: String
  let job: VerificationJobResponse
  let frameCount: Int
}

struct ArtifactResponse: Codable {
  let question: String
  let answer: String
  let frames: [ArtifactFrame]

  struct ArtifactFrame: Codable {
    let url: String
    let timestamp: Double
  }
}

@MainActor
class SabiAPIClient: ObservableObject {
  @Published var isLoading: Bool = false
  @Published var statusMessage: String = ""
  @Published var error: String?

  private var baseURL: String { SabiConfig.url }

  /// Ensures we have a valid API key, auto-signing up if needed.
  func ensureAuthenticated() async throws {
    if let key = SettingsManager.shared.sabiApiKey, !key.isEmpty { return }

    let agentId = "verifier_\(UUID().uuidString.prefix(12).lowercased())"
    let url = URL(string: "\(baseURL)/api/auth/signup")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: ["nvmAgentId": agentId])

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
      let body = String(data: data, encoding: .utf8) ?? ""
      throw SabiAPIError.apiError("Auto-signup failed: \(body.prefix(200))")
    }

    let result = try JSONDecoder().decode(SignupResponse.self, from: data)
    SettingsManager.shared.sabiApiKey = result.apiKey
    NSLog("[SabiAPI] Auto-signup complete, API key saved")
  }

  private func addAuth(_ request: inout URLRequest) {
    if let apiKey = SettingsManager.shared.sabiApiKey {
      request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
    }
  }

  // List available verification jobs
  func listAvailableJobs() async throws -> [AvailableJob] {
    try await ensureAuthenticated()
    let urlString = "\(baseURL)/api/verifications"
    NSLog("[SabiAPI] listAvailableJobs → %@", urlString)
    var request = URLRequest(url: URL(string: urlString)!)
    request.httpMethod = "GET"
    addAuth(&request)

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
      let body = String(data: data, encoding: .utf8) ?? ""
      throw SabiAPIError.apiError("List jobs failed: \(body.prefix(200))")
    }

    let result = try JSONDecoder().decode(AvailableJobsResponse.self, from: data)
    return result.jobs
  }

  // Seed dummy jobs for demo
  func seedJobs() async throws {
    try await ensureAuthenticated()
    var request = URLRequest(url: URL(string: "\(baseURL)/api/seed")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    addAuth(&request)

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
      let body = String(data: data, encoding: .utf8) ?? ""
      throw SabiAPIError.apiError("Seed failed: \(body.prefix(200))")
    }
  }

  // List jobs for a verifier (their history)
  func listMyVerifications(verifierId: String) async throws -> [AvailableJob] {
    try await ensureAuthenticated()
    var request = URLRequest(url: URL(string: "\(baseURL)/api/verifications?verifierId=\(verifierId)")!)
    request.httpMethod = "GET"
    addAuth(&request)

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
      let body = String(data: data, encoding: .utf8) ?? ""
      throw SabiAPIError.apiError("List my jobs failed: \(body.prefix(200))")
    }

    let result = try JSONDecoder().decode(AvailableJobsResponse.self, from: data)
    return result.jobs
  }

  // Cancel a verification job (returns it to available)
  func cancelJob(jobId: String) async throws {
    try await ensureAuthenticated()
    var request = URLRequest(url: URL(string: "\(baseURL)/api/verifications/\(jobId)/cancel")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    addAuth(&request)

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
      let body = String(data: data, encoding: .utf8) ?? ""
      throw SabiAPIError.apiError("Cancel failed: \(body.prefix(200))")
    }
  }

  // Accept a verification job
  func acceptJob(jobId: String, verifierId: String) async throws {
    try await ensureAuthenticated()
    isLoading = true
    error = nil
    statusMessage = "Accepting job..."

    let body = try JSONSerialization.data(withJSONObject: ["verifierId": verifierId])
    var request = URLRequest(url: URL(string: "\(baseURL)/api/verifications/\(jobId)/accept")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    addAuth(&request)
    request.httpBody = body

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
      let body = String(data: data, encoding: .utf8) ?? ""
      throw SabiAPIError.apiError("Accept failed: \(body.prefix(200))")
    }

    isLoading = false
    statusMessage = ""
  }

  // Start a verification session
  func startSession(jobId: String) async throws {
    try await ensureAuthenticated()
    isLoading = true
    statusMessage = "Starting session..."

    var request = URLRequest(url: URL(string: "\(baseURL)/api/verifications/\(jobId)/start")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    addAuth(&request)

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
      let body = String(data: data, encoding: .utf8) ?? ""
      throw SabiAPIError.apiError("Start session failed: \(body.prefix(200))")
    }

    isLoading = false
    statusMessage = ""
  }

  // Upload frames during a session (raw JPEG to match backend expectation)
  func uploadFrames(
    frames: [CapturedFrame],
    jobId: String,
    onProgress: @escaping (Int) -> Void
  ) async throws {
    try await ensureAuthenticated()
    for (index, frame) in frames.enumerated() {
      guard let jpegData = frame.image.jpegData(compressionQuality: 0.7) else { continue }

      var request = URLRequest(url: URL(string: "\(baseURL)/api/verifications/\(jobId)/frames")!)
      request.httpMethod = "POST"
      request.setValue("image/jpeg", forHTTPHeaderField: "Content-Type")
      addAuth(&request)
      request.httpBody = jpegData

      let (_, resp) = try await URLSession.shared.data(for: request)
      if let http = resp as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
        NSLog("[SabiAPI] Frame %d upload failed: HTTP %d", index, http.statusCode)
      }

      onProgress(index + 1)
    }
  }

  // End a verification session
  func endSession(jobId: String, answer: String, transcript: String? = nil) async throws {
    try await ensureAuthenticated()
    isLoading = true
    statusMessage = "Submitting answer..."

    var payload: [String: Any] = ["answer": answer]
    if let transcript, !transcript.isEmpty {
      payload["transcript"] = transcript
    }
    let body = try JSONSerialization.data(withJSONObject: payload)
    var request = URLRequest(url: URL(string: "\(baseURL)/api/verifications/\(jobId)/end")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    addAuth(&request)
    request.httpBody = body

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
      let body = String(data: data, encoding: .utf8) ?? ""
      throw SabiAPIError.apiError("End session failed: \(body.prefix(200))")
    }

    isLoading = false
    statusMessage = ""
  }

  // Get job status
  func getJobStatus(jobId: String) async throws -> JobStatusResponse {
    try await ensureAuthenticated()
    var request = URLRequest(url: URL(string: "\(baseURL)/api/verifications/\(jobId)")!)
    request.httpMethod = "GET"
    addAuth(&request)

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
      let body = String(data: data, encoding: .utf8) ?? ""
      throw SabiAPIError.apiError("Get status failed: \(body.prefix(200))")
    }

    return try JSONDecoder().decode(JobStatusResponse.self, from: data)
  }

  enum SabiAPIError: LocalizedError {
    case apiError(String)

    var errorDescription: String? {
      switch self {
      case .apiError(let msg): return msg
      }
    }
  }
}
