import Foundation

struct RemoteConfigResponse: Codable {
  let minAppVersion: String
  let latestAppVersion: String
  let apiBaseUrl: String
  let features: [String: Bool]?
}

@MainActor
class RemoteConfig {
  static let shared = RemoteConfig()
  private init() {}

  private(set) var config: RemoteConfigResponse?
  private(set) var updateAvailable = false

  /// Fetch remote config from the backend. If the backend URL has changed,
  /// update SettingsManager so all future API calls use the new URL.
  func fetch() async {
    let currentURL = SabiConfig.url
    guard let url = URL(string: "\(currentURL)/api/config") else { return }

    do {
      var request = URLRequest(url: url)
      request.timeoutInterval = 5
      let (data, response) = try await URLSession.shared.data(for: request)
      guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { return }

      let decoded = try JSONDecoder().decode(RemoteConfigResponse.self, from: data)
      config = decoded

      // If the backend tells us to use a different API URL, update settings
      if !decoded.apiBaseUrl.isEmpty, decoded.apiBaseUrl != currentURL {
        SettingsManager.shared.workerURL = decoded.apiBaseUrl
        NSLog("[RemoteConfig] Updated API URL to: %@", decoded.apiBaseUrl)
      }

      // Check if app update is available
      let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.0.0"
      updateAvailable = compareVersions(appVersion, decoded.latestAppVersion) == .orderedAscending
    } catch {
      NSLog("[RemoteConfig] Fetch failed: %@", error.localizedDescription)
    }
  }

  private func compareVersions(_ a: String, _ b: String) -> ComparisonResult {
    let aParts = a.split(separator: ".").compactMap { Int($0) }
    let bParts = b.split(separator: ".").compactMap { Int($0) }
    let count = max(aParts.count, bParts.count)
    for i in 0..<count {
      let av = i < aParts.count ? aParts[i] : 0
      let bv = i < bParts.count ? bParts[i] : 0
      if av < bv { return .orderedAscending }
      if av > bv { return .orderedDescending }
    }
    return .orderedSame
  }
}
