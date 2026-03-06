import { Command } from "commander";
import { loadConfig, saveConfig, resetConfig } from "../../config.js";

export const configCmd = new Command("config")
  .description("Get or set Sabi CLI configuration")
  .argument("[key]", "Config key (apiUrl, nvmApiKey)")
  .argument("[value]", "Value to set")
  .option("--reset", "Reset config to defaults")
  .action((key?: string, value?: string, opts?: { reset?: boolean }) => {
    try {
      if (opts?.reset) {
        resetConfig();
        console.log("\n  Config reset to defaults.\n");
        return;
      }

      if (!key) {
        const config = loadConfig();
        console.log();
        console.log(`  apiUrl:    ${config.apiUrl}`);
        console.log(`  nvmApiKey: ${config.nvmApiKey ? config.nvmApiKey.slice(0, 8) + "..." : "(not set)"}`);
        console.log();
        console.log("  Set with: sabi config <key> <value>");
        console.log("  Keys: apiUrl, nvmApiKey");
        console.log("  Env vars: SABI_API_URL, SABI_API_KEY, SABI_NVM_API_KEY, NVM_API_KEY");
        console.log();
        return;
      }

      if (key && !value) {
        const config = loadConfig();
        const val = (config as Record<string, string | undefined>)[key];
        if (val !== undefined) {
          console.log(`\n  ${key}: ${key === "nvmApiKey" || key === "apiKey" ? val.slice(0, 8) + "..." : val}\n`);
        } else {
          console.log(`\n  Unknown key: ${key}\n`);
        }
        return;
      }

      if (key === "apiUrl" || key === "nvmApiKey") {
        saveConfig({ [key]: value });
        console.log(`\n  ${key} saved.\n`);
      } else {
        console.error(`\n  Unknown key: ${key}. Valid keys: apiUrl, nvmApiKey\n`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
