import Foundation

final class SettingsManager {
  static let shared = SettingsManager()

  private let defaults = UserDefaults.standard

  private enum Key: String {
    case geminiAPIKey
    case geminiSystemPrompt
    case workerURL
    case workerToken
    case sabiApiKey
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
      // If the cached URL points to ngrok, localhost, or a LAN IP, fall back to the compiled default
      if let saved,
         saved.contains("ngrok") || saved.contains("localhost") || saved.contains("127.0.0.1") ||
         saved.contains("192.168.") || saved.contains("172.") || saved.contains("10.") {
        defaults.removeObject(forKey: Key.workerURL.rawValue)
        return Secrets.workerURL
      }
      return saved ?? Secrets.workerURL
    }
    set { defaults.set(newValue, forKey: Key.workerURL.rawValue) }
  }

  // MARK: - Sabi Auth

  var sabiApiKey: String? {
    get { defaults.string(forKey: Key.sabiApiKey.rawValue) ?? Secrets.sabiApiKey }
    set { defaults.set(newValue, forKey: Key.sabiApiKey.rawValue) }
  }

  // MARK: - Reset

  func resetAll() {
    for key in [Key.geminiAPIKey, .geminiSystemPrompt, .workerURL, .workerToken, .sabiApiKey] {
      defaults.removeObject(forKey: key.rawValue)
    }
  }
}
