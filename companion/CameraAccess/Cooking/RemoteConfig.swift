import Foundation

struct RemoteConfigResponse: Codable {
  let apiBaseUrl: String
}

@MainActor
class RemoteConfig {
  static let shared = RemoteConfig()
  private init() {}

  func fetch() async {
    let currentURL = SabiConfig.url
    guard let url = URL(string: "\(currentURL)/api/config") else { return }

    do {
      var request = URLRequest(url: url)
      request.timeoutInterval = 5
      let (data, response) = try await URLSession.shared.data(for: request)
      guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { return }

      let decoded = try JSONDecoder().decode(RemoteConfigResponse.self, from: data)

      if !decoded.apiBaseUrl.isEmpty, decoded.apiBaseUrl != currentURL {
        SettingsManager.shared.workerURL = decoded.apiBaseUrl
        NSLog("[RemoteConfig] Updated API URL to: %@", decoded.apiBaseUrl)
      }
    } catch {
      NSLog("[RemoteConfig] Fetch failed: %@", error.localizedDescription)
    }
  }
}
