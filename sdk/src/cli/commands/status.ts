import { Command } from "commander";
import { SabiClient } from "../../client.js";

export const statusCmd = new Command("status")
  .description("Get the status of a verification job")
  .argument("<job-id>", "The job ID")
  .option("--api-url <string>", "Override API base URL")
  .action(async (jobId: string, opts) => {
    try {
      const client = new SabiClient(opts.apiUrl ? { apiUrl: opts.apiUrl } : undefined);
      const state = await client.getStatus(jobId);

      console.log();
      console.log(`  Job ID:     ${state.job?.id ?? jobId}`);
      console.log(`  Status:     ${state.status}`);
      console.log(`  Question:   ${state.job?.question ?? "-"}`);
      console.log(`  Verifier:   ${state.job?.verifier_id ?? "-"}`);
      console.log(`  Answer:     ${state.job?.answer ?? "-"}`);
      console.log(`  Frames:     ${state.frames?.length ?? 0}`);
      console.log(`  Created:    ${state.job?.created_at ? new Date(state.job.created_at).toLocaleString() : "-"}`);
      console.log();
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
