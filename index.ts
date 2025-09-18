import { initZkEmailSdk, Proof } from "@zk-email/sdk";
import fs from "fs/promises";

async function main() {
  console.log("🚀 Starting ZK Email SDK example");

  console.log("📦 Initializing ZK Email SDK...");
  const sdk = initZkEmailSdk();
  console.log("✅ SDK initialized successfully");

  // Get blueprint from the registry
  console.log("🔍 Fetching blueprint from registry...");
  const blueprint = await sdk.getBlueprint(
    "Bisht13/SuccinctZKResidencyInvite@v3"
  );
  console.log("✅ Blueprint fetched successfully");
  const verifier = blueprint.props.verifierContract;
  if (verifier) {
    console.log(
      `🏛️ Verifier contract: ${verifier.address ?? "(no address)"} on chain ${
        verifier.chain
      }`
    );
  } else {
    console.log("🏛️ Verifier contract: not available");
  }

  console.log("🛠️ Creating prover...");
  const prover = blueprint.createProver();
  console.log("✅ Prover created successfully");

  // Read email file
  console.log("📧 Reading email file: residency.eml");
  const eml = await fs.readFile("residency.eml", "utf-8");
  console.log(`✅ Email file read successfully (${eml.length} characters)`);

  // Generate the proof
  console.log("⚡ Generating proof...");
  const proof = await prover.generateProof(eml);
  console.log("✅ Proof generated successfully");
  console.log("Proof:", proof);

  // Verify the proof off chain
  console.log("🔐 Verifying proof on-chain...");
  const verification = await blueprint.verifyProofOnChain(proof);
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
