import { readFileSync, writeFileSync, mkdirSync, chmodSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { SabiConfig } from "./types.js";

const RC_PATH = join(homedir(), ".sabirc");

export function loadConfig(): SabiConfig {
  const config: SabiConfig = { apiUrl: "https://sabi-backend.ben-imadali.workers.dev" };

  // 1. File config
  try {
    const raw = readFileSync(RC_PATH, "utf-8");
    const file = JSON.parse(raw);
    if (file.apiUrl) config.apiUrl = file.apiUrl;
    if (file.apiKey) config.apiKey = file.apiKey;
    if (file.nvmAgentId) config.nvmAgentId = file.nvmAgentId;
  } catch {
    // No config file, use defaults
  }

  // 2. Env vars override
  if (process.env.SABI_API_URL) config.apiUrl = process.env.SABI_API_URL;
  if (process.env.SABI_API_KEY) config.apiKey = process.env.SABI_API_KEY;
  if (process.env.SABI_NVM_AGENT_ID) config.nvmAgentId = process.env.SABI_NVM_AGENT_ID;

  return config;
}

export function saveConfig(updates: Partial<SabiConfig>): SabiConfig {
  const current = loadConfig();
  const merged = { ...current, ...updates };

  const dir = join(homedir());
  mkdirSync(dir, { recursive: true });
  writeFileSync(RC_PATH, JSON.stringify(merged, null, 2) + "\n", "utf-8");

  // Restrict permissions (owner-only) since it may contain API key
  try {
    chmodSync(RC_PATH, 0o600);
  } catch {
    // Windows doesn't support chmod
  }

  return merged;
}

export function resetConfig(): void {
  try {
    writeFileSync(RC_PATH, "{}\n", "utf-8");
  } catch {
    // File may not exist
  }
}

export function resolveConfig(overrides?: Partial<SabiConfig>): SabiConfig {
  const config = loadConfig();
  if (overrides?.apiUrl) config.apiUrl = overrides.apiUrl;
  if (overrides?.apiKey) config.apiKey = overrides.apiKey;
  if (overrides?.nvmAgentId) config.nvmAgentId = overrides.nvmAgentId;
  return config;
}
