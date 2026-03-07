import { Command } from "commander";
import { SabiClient } from "../../client.js";

export const watchCmd = new Command("watch")
  .description("Watch a verification job for real-time updates")
  .argument("<job-id>", "The job ID to watch")
  .option("--api-url <string>", "Override API base URL")
  .action(async (jobId: string, opts) => {
    try {
      const client = new SabiClient(opts.apiUrl ? { apiUrl: opts.apiUrl } : undefined);

      console.log(`\n  Watching job ${jobId} (Ctrl+C to stop)...\n`);

      const watcher = client.watchJob(jobId);

      watcher.on("state", (state) => {
        const ts = new Date().toLocaleTimeString();
        console.log(`  [${ts}] Status: ${state.status} | Frames: ${state.frames?.length ?? 0}`);
        if (state.job?.answer) {
          console.log(`           Answer: ${state.job.answer}`);
        }
        if (state.status === "verified") {
          console.log("\n  Verification complete.");
          watcher.close();
        }
      });

      watcher.on("error", (err) => {
        console.error(`  WebSocket error: ${err.message}`);
      });

      watcher.on("close", () => {
        console.log("  Connection closed.\n");
        process.exit(0);
      });

      process.on("SIGINT", () => {
        watcher.close();
        process.exit(0);
      });
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
