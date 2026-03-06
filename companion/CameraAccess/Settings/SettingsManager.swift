import Foundation

final class SettingsManager {
  static let shared = SettingsManager()

  private let defaults = UserDefaults.standard

  private enum Key: String {
    case geminiAPIKey
    case geminiSystemPrompt
    case workerURL
    case workerToken
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
      // If the saved URL points to localhost, a LAN IP, or an ngrok tunnel, fall back to the compiled default
      // (these are unreachable from a real device or expire)
      if let saved,
         saved.contains("localhost") || saved.contains("172.") || saved.contains("192.168.") || saved.contains("ngrok") {
        return Secrets.workerURL
      }
      return saved ?? Secrets.workerURL
    }
    set { defaults.set(newValue, forKey: Key.workerURL.rawValue) }
  }

  // MARK: - Reset

  func resetAll() {
    for key in [Key.geminiAPIKey, .geminiSystemPrompt, .workerURL, .workerToken] {
      defaults.removeObject(forKey: key.rawValue)
    }
  }
}
