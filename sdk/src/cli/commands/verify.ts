import { Command } from "commander";
import { SabiClient } from "../../client.js";
import { PaymentRequiredError } from "../../errors.js";

export const verifyCmd = new Command("verify")
  .description("Create a new verification job")
  .argument("<question>", "The question to verify on-site")
  .requiredOption("--lat <number>", "Target latitude", parseFloat)
  .requiredOption("--lng <number>", "Target longitude", parseFloat)
  .option("--category <string>", "Job category")
  .option("--requester-id <string>", "Requester ID")
  .option("--payout <number>", "Verifier payout amount", parseFloat)
  .option("--access-token <string>", "x402 payment access token")
  .option("--watch", "Watch for real-time updates after creation")
  .option("--api-url <string>", "Override API base URL")
  .action(async (question: string, opts) => {
    try {
      const client = new SabiClient(opts.apiUrl ? { apiUrl: opts.apiUrl } : undefined);

      console.log("Creating verification...");
      const result = await client.createVerification({
        question,
        targetLat: opts.lat,
        targetLng: opts.lng,
        category: opts.category,
        requesterId: opts.requesterId,
        payout: opts.payout,
        accessToken: opts.accessToken,
      });

      console.log();
      console.log(`  Job ID:    ${result.job.id}`);
      console.log(`  Status:    ${result.job.status}`);
      console.log(`  Question:  ${result.job.question}`);
      console.log(`  Location:  ${result.job.target_lat}, ${result.job.target_lng}`);
      console.log(`  Payment:   ${result.payment.creditsRedeemed} credits (tx: ${result.payment.transaction})`);
      console.log(`  Remaining: ${result.payment.remainingBalance} credits`);
      console.log();

      if (opts.watch) {
        console.log("Watching for updates (Ctrl+C to stop)...\n");
        const watcher = client.watchJob(result.job.id);
        watcher.on("state", (state) => {
          const ts = new Date().toLocaleTimeString();
          console.log(`  [${ts}] Status: ${state.status} | Frames: ${state.frames?.length ?? 0}`);
          if (state.job?.answer) {
            console.log(`  Answer: ${state.job.answer}`);
          }
        });
        watcher.on("error", (err) => console.error("  WebSocket error:", err.message));
        watcher.on("close", () => {
          console.log("  Connection closed.");
          process.exit(0);
        });

        process.on("SIGINT", () => {
          watcher.close();
          process.exit(0);
        });
      }
    } catch (err) {
      if (err instanceof PaymentRequiredError) {
        console.error("\n  Payment required.");
        if (err.paymentInfo) {
          const accepts = (err.paymentInfo as { accepts?: { planId?: string; extra?: { agentId?: string } }[] }).accepts;
          if (accepts?.[0]) {
            console.error(`  Plan ID:    ${accepts[0].planId}`);
            console.error(`  Agent ID:   ${accepts[0].extra?.agentId}`);
          }
        }
        console.error("\n  Obtain an x402 access token from Nevermined and pass it via --access-token.\n");
        process.exit(1);
      }
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
