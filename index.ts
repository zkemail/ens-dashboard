/// <reference lib="dom" />
import { Buffer as BufferPolyfill } from "buffer";

// Shim for Node's non-standard global used by some Buffer polyfills
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).numberIsNaN ??= Number.isNaN;
// Ensure Buffer is available in the browser for libs expecting Node's Buffer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Buffer ??= BufferPolyfill;
// Minimal process shim if needed by dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).process ??= { env: {} };

export async function main() {
  console.log("🚀 Starting ZK Email SDK example");

  console.log("📦 Initializing ZK Email SDK...");
  const { default: zkeSdk } = await import("@zk-email/sdk");
  const { initNoirWasm } = await import("@zk-email/sdk/initNoirWasm");
  const sdk = zkeSdk({
    baseUrl: "https://dev-conductor.zk.email",
    logging: { enabled: true, level: "debug" },
  });
  console.log("✅ SDK initialized successfully");

  // Get blueprint from the registry
  console.log("🔍 Fetching blueprint from registry...");
  const blueprint = await sdk.getBlueprint("benceharomi/X_HANDLE@v2");
  console.log("✅ Blueprint fetched successfully");

  console.log("🛠️ Creating prover...");
  const prover = blueprint.createProver({ isLocal: true });
  console.log("✅ Prover created successfully");

  // Read email file (browser fetch)
  console.log("📧 Fetching email file: x.eml");
  const eml = await (await fetch("/x.eml")).text();
  console.log(`✅ Email fetched successfully (${eml.length} characters)`);

  // Generate the proof
  console.log("⚡ Generating proof...");

  // Hardcoded external inputs required by this blueprint
  const externalInputs = [{ name: "command", value: "@thezkdev" }];

  const noirWasm = await initNoirWasm();
  const proof = await prover.generateProof(eml, externalInputs, { noirWasm });
  console.log("✅ Proof generated successfully");
  console.log("Proof:", proof);

  // Verify the proof off chain
  console.log("🔐 Verifying proof off-chain...");
  const verification = await blueprint.verifyProof(proof, { noirWasm });
  console.log("✅ Proof verification completed");

  console.log("Verification:", verification);
  console.log("🎉 Process completed successfully!");

  return { proof, verification };
}

// Wire up browser UI
function setupBrowserUI() {
  const runButton = document.getElementById("run") as HTMLButtonElement | null;
  const statusEl = document.getElementById("status");
  const outputEl = document.getElementById("output");
  if (!runButton || !statusEl || !outputEl) return;

  runButton.addEventListener("click", async () => {
    runButton.disabled = true;
    statusEl.textContent = "Running... this may take a moment";
    outputEl.textContent = "";
    try {
      const { proof, verification } = await main();
      outputEl.textContent = JSON.stringify({ proof, verification }, null, 2);
      statusEl.textContent = "Completed";
    } catch (error) {
      console.error(error);
      statusEl.textContent = "Error";
      outputEl.textContent = String(error);
    } finally {
      runButton.disabled = false;
    }
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupBrowserUI);
  } else {
    setupBrowserUI();
  }
}
