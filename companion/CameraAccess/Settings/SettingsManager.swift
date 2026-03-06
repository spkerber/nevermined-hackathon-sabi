import Foundation

final class SettingsManager {
  static let shared = SettingsManager()

  private let defaults = UserDefaults.standard

  private enum Key: String {
    case geminiAPIKey
    case geminiSystemPrompt
    case workerURL
    case workerToken
    case webrtcSignalingURL
  }

  private init() {}

  // MARK: - Gemini

  var geminiAPIKey: String {
    get { defaults.string(forKey: Key.geminiAPIKey.rawValue) ?? Secrets.geminiAPIKey }
    set { defaults.set(newValue, forKey: Key.geminiAPIKey.rawValue) }
  }

  var geminiSystemPrompt: String {
    get { defaults.string(forKey: Key.geminiSystemPrompt.rawValue) ?? GeminiConfig.defaultSystemInstruction }
    set { defaults.set(newValue, forKey: Key.geminiSystemPrompt.rawValue) }
  }

  // MARK: - Worker

  var workerURL: String {
    get {
      let saved = defaults.string(forKey: Key.workerURL.rawValue)
      // If the saved URL points to localhost or a LAN IP, fall back to the compiled default
      // (these are unreachable from a real device on a different network)
      if let saved, saved.contains("localhost") || saved.contains("172.24.") || saved.contains("192.168.") {
        return Secrets.workerURL
      }
      return saved ?? Secrets.workerURL
    }
    set { defaults.set(newValue, forKey: Key.workerURL.rawValue) }
  }

  var workerToken: String {
    get { defaults.string(forKey: Key.workerToken.rawValue) ?? Secrets.workerToken }
    set { defaults.set(newValue, forKey: Key.workerToken.rawValue) }
  }

  // MARK: - WebRTC

  var webrtcSignalingURL: String {
    get { defaults.string(forKey: Key.webrtcSignalingURL.rawValue) ?? Secrets.webrtcSignalingURL }
    set { defaults.set(newValue, forKey: Key.webrtcSignalingURL.rawValue) }
  }

  // MARK: - Reset

  func resetAll() {
    for key in [Key.geminiAPIKey, .geminiSystemPrompt, .workerURL, .workerToken, .webrtcSignalingURL] {
      defaults.removeObject(forKey: key.rawValue)
    }
  }
}
