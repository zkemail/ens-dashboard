import { concatHex, type Hex } from "viem";

const REMOTE_PROVER_URL = "https://noir-prover.zk.email/prove";

interface RemoteProofResponse {
  proof: Hex[];
  publicInputs: Hex[];
}

/**
 * Send an email to the remote proving backend and return proof data
 * in the shape that the on-chain submit flow expects.
 */
export async function remoteProve(
  rawEmail: string,
  blueprintSlug: string,
  command: string,
): Promise<{ props: { proofData: string; publicOutputs: Hex[] } }> {
  const response = await fetch(REMOTE_PROVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawEmail, blueprintSlug, command }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Remote prover error: ${response.status} - ${errorText}`);
  }

  const result: RemoteProofResponse = await response.json();

  if (
    !result?.proof ||
    !Array.isArray(result.proof) ||
    !result?.publicInputs ||
    !Array.isArray(result.publicInputs)
  ) {
    throw new Error(
      "Invalid response from remote prover. Expected { proof: string[], publicInputs: string[] }",
    );
  }

  // Concatenate proof array into a single hex string (same as paytox)
  const proofData = concatHex(result.proof);

  return {
    props: {
      proofData,
      publicOutputs: result.publicInputs,
    },
  };
}
