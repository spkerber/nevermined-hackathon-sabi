import { Command } from "commander";
import { SabiClient } from "../../client.js";
import { saveConfig } from "../../config.js";

export const initCmd = new Command("init")
  .description("Sign up and configure Sabi (auto-creates an account)")
  .option("--api-url <string>", "Override API base URL")
  .action(async (opts) => {
    try {
      const clientOpts: Record<string, string> = {};
      if (opts.apiUrl) clientOpts.apiUrl = opts.apiUrl;
      const client = new SabiClient(clientOpts);

      console.log("Signing up with Sabi...");
      const { apiKey, userId } = await client.signup();

      saveConfig({ apiKey });

      console.log();
      console.log("  Ready to go.");
      console.log();
      console.log(`  User ID:       ${userId}`);
      console.log(`  API Key:       ${apiKey.slice(0, 12)}...`);
      console.log();
      console.log("  Config saved to ~/.sabirc");
      console.log();
      console.log("  Try it:");
      console.log('  npx sabi verify "Is the coffee shop open?" --lat 37.78 --lng -122.41 --access-token <token>');
      console.log();
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
