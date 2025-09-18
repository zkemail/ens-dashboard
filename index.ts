import { initZkEmailSdk, Proof } from "@zk-email/sdk";
import { Noir } from "@noir-lang/noir_js";
import { UltraHonkBackend } from "@aztec/bb.js";
import fs from "fs/promises";

async function main() {
  console.log("🚀 Starting ZK Email SDK example");

  console.log("📦 Initializing ZK Email SDK...");
  const sdk = initZkEmailSdk({
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

  // Read email file
  console.log("📧 Reading email file: x.eml");
  const eml = await fs.readFile("x.eml", "utf-8");
  console.log(`✅ Email file read successfully (${eml.length} characters)`);

  // Generate the proof
  console.log("⚡ Generating proof...");

  // Hardcoded external inputs required by this blueprint
  const externalInputs = [{ name: "command", value: "zkfriendly" }];

  const proof = await prover.generateProof(eml, externalInputs, {
    noirWasm: {
      Noir,
      UltraHonkBackend,
    },
  });
  console.log("✅ Proof generated successfully");
  console.log("Proof:", proof);

  // Verify the proof off chain
  console.log("🔐 Verifying proof off-chain...");
  const verification = await blueprint.verifyProof(proof);
  console.log("✅ Proof verification completed");

  console.log("Verification:", verification);
  console.log("🎉 Process completed successfully!");
}

(async () => {
  try {
    await main();
  } catch (error) {
    console.error("❌ Error occurred:", error);
    process.exit(1);
  }
})();
