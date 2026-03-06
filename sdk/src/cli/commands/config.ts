import { Command } from "commander";
import { loadConfig, saveConfig, resetConfig } from "../../config.js";

export const configCmd = new Command("config")
  .description("Get or set Sabi CLI configuration")
  .argument("[key]", "Config key (apiUrl)")
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
        console.log(`  apiUrl:  ${config.apiUrl}`);
        console.log();
        console.log("  Set with: sabi config <key> <value>");
        console.log("  Keys: apiUrl");
        console.log("  Env vars: SABI_API_URL, SABI_API_KEY");
        console.log();
        return;
      }

      if (key && !value) {
        const config = loadConfig();
        const val = (config as unknown as Record<string, string | undefined>)[key];
        if (val !== undefined) {
          console.log(`\n  ${key}: ${key === "apiKey" ? val.slice(0, 8) + "..." : val}\n`);
        } else {
          console.log(`\n  Unknown key: ${key}\n`);
        }
        return;
      }

      if (key === "apiUrl") {
        saveConfig({ [key]: value });
        console.log(`\n  ${key} saved.\n`);
      } else {
        console.error(`\n  Unknown key: ${key}. Valid keys: apiUrl\n`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
