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

  // List available verification jobs
  func listAvailableJobs() async throws -> [AvailableJob] {
    var request = URLRequest(url: URL(string: "\(baseURL)/api/verifications")!)
    request.httpMethod = "GET"

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
    var request = URLRequest(url: URL(string: "\(baseURL)/api/seed")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
      let body = String(data: data, encoding: .utf8) ?? ""
      throw SabiAPIError.apiError("Seed failed: \(body.prefix(200))")
    }
  }

  // Cancel a verification job (returns it to available)
  func cancelJob(jobId: String) async throws {
    var request = URLRequest(url: URL(string: "\(baseURL)/api/verifications/\(jobId)/cancel")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
      let body = String(data: data, encoding: .utf8) ?? ""
      throw SabiAPIError.apiError("Cancel failed: \(body.prefix(200))")
    }
  }

  // Accept a verification job
  func acceptJob(jobId: String, verifierId: String) async throws {
    isLoading = true
    error = nil
    statusMessage = "Accepting job..."

    let body = try JSONSerialization.data(withJSONObject: ["verifierId": verifierId])
    var request = URLRequest(url: URL(string: "\(baseURL)/api/verifications/\(jobId)/accept")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
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
    isLoading = true
    statusMessage = "Starting session..."

    var request = URLRequest(url: URL(string: "\(baseURL)/api/verifications/\(jobId)/start")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

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
    for (index, frame) in frames.enumerated() {
      guard let jpegData = frame.image.jpegData(compressionQuality: 0.7) else { continue }

      var request = URLRequest(url: URL(string: "\(baseURL)/api/verifications/\(jobId)/frames")!)
      request.httpMethod = "POST"
      request.setValue("image/jpeg", forHTTPHeaderField: "Content-Type")
      request.httpBody = jpegData

      let (_, resp) = try await URLSession.shared.data(for: request)
      if let http = resp as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
        NSLog("[SabiAPI] Frame %d upload failed: HTTP %d", index, http.statusCode)
      }

      onProgress(index + 1)
    }
  }

  // End a verification session
  func endSession(jobId: String, answer: String) async throws {
    isLoading = true
    statusMessage = "Submitting answer..."

    let body = try JSONSerialization.data(withJSONObject: ["answer": answer])
    var request = URLRequest(url: URL(string: "\(baseURL)/api/verifications/\(jobId)/end")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
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
    var request = URLRequest(url: URL(string: "\(baseURL)/api/verifications/\(jobId)")!)
    request.httpMethod = "GET"

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
      let body = String(data: data, encoding: .utf8) ?? ""
      throw SabiAPIError.apiError("Get status failed: \(body.prefix(200))")
    }

    return try JSONDecoder().decode(JobStatusResponse.self, from: data)
  }

  // Full verification flow: accept -> start -> upload frames -> end
  func completeVerification(
    session: VerificationSessionManager,
    verifierId: String
  ) async {
    guard let jobId = session.jobId, let answer = session.answer else {
      error = "Missing job ID or answer"
      return
    }

    isLoading = true
    error = nil

    do {
      // Upload frames
      statusMessage = "Uploading photos (0/\(session.capturedFrames.count))..."
      try await uploadFrames(frames: session.capturedFrames, jobId: jobId) { uploaded in
        Task { @MainActor in
          self.statusMessage = "Uploading photos (\(uploaded)/\(session.capturedFrames.count))..."
        }
      }

      // End session with answer
      statusMessage = "Submitting verification..."
      try await endSession(jobId: jobId, answer: answer)

      statusMessage = "Done!"
    } catch {
      self.error = error.localizedDescription
      NSLog("[SabiAPI] Error: %@", error.localizedDescription)
    }

    isLoading = false
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
