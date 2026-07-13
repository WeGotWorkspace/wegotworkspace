import { runPnpmCommand, runResultToJson } from "./run-command.js";
import { getVerificationContext } from "./verification-context.js";

async function main(): Promise<void> {
  const context = await getVerificationContext();
  if (!context.includes("Agent policy vs enforcement")) {
    throw new Error("get_verification_context smoke check failed");
  }

  const result = await runPnpmCommand({
    args: ["--version"],
    label: "PNPM VERSION",
    timeoutMs: 30_000,
    tailLines: 5,
  });

  if (result.status !== "passed") {
    throw new Error(`pnpm --version failed: ${runResultToJson(result)}`);
  }

  if (!result.output.trim()) {
    throw new Error("run command returned empty output");
  }

  console.error("smoke-test: OK");
  console.error(runResultToJson(result));
}

main().catch((error: unknown) => {
  console.error("smoke-test: FAILED", error);
  process.exit(1);
});
