import { Command } from "commander";
import { SabiClient } from "../../client.js";

export const listCmd = new Command("list")
  .description("List verification jobs")
  .option("--requester-id <string>", "Filter by requester ID")
  .option("--verifier-id <string>", "Filter by verifier ID")
  .option("--api-url <string>", "Override API base URL")
  .action(async (opts) => {
    try {
      const client = new SabiClient(opts.apiUrl ? { apiUrl: opts.apiUrl } : undefined);
      const jobs = await client.listJobs({
        requesterId: opts.requesterId,
        verifierId: opts.verifierId,
      });

      if (jobs.length === 0) {
        console.log("\n  No verification jobs found.\n");
        return;
      }

      console.log();
      console.log(
        "  " +
        "ID".padEnd(38) +
        "STATUS".padEnd(14) +
        "PAYOUT".padEnd(8) +
        "QUESTION"
      );
      console.log("  " + "-".repeat(80));

      for (const job of jobs) {
        const q = job.question.length > 40 ? job.question.slice(0, 37) + "..." : job.question;
        console.log(
          "  " +
          job.id.padEnd(38) +
          job.status.padEnd(14) +
          `$${job.payout}`.padEnd(8) +
          q
        );
      }
      console.log();
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
