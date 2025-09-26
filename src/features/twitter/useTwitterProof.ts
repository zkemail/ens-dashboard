import { useCallback, useMemo, useState } from "react";
import { Buffer as BufferPolyfill } from "buffer";
import { useReadContract, useWriteContract } from "wagmi";
import { entrypointAbi } from "../records/abi";
import { CONTRACTS } from "../../config/contracts";

// Browser polyfills for libs expecting Node-like globals
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).numberIsNaN ??= Number.isNaN;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Buffer ??= BufferPolyfill;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).process ??= { env: {} };
// Ensure NODE_ENV is a string. Some deps call process.env.NODE_ENV.slice()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const __proc: any = (globalThis as any).process;
__proc.env ??= {};
if (typeof __proc.env.NODE_ENV !== "string") {
  __proc.env.NODE_ENV = "development";
}
// Some libs call process.version.slice or read versions.node
__proc.version ??= "v18.0.0";
__proc.versions ??= {};
if (typeof __proc.versions.node !== "string") {
  __proc.versions.node = "18.0.0";
}

type ProofResult = {
  proof: unknown;
  verification: unknown;
};

export function useTwitterProof() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProofResult | null>(null);
  const [step, setStep] = useState<string>("");
  const { writeContractAsync } = useWriteContract();

  const run = useCallback(
    async (emlFile: File, command: string) => {
      setIsLoading(true);
      setError(null);
      setResult(null);
      try {
        if (!emlFile) throw new Error("Please choose a .eml file");
        const fileOk = emlFile.name?.toLowerCase().endsWith(".eml");
        if (!fileOk) throw new Error("File must be a .eml email export");
        const commandValue = String(command || "").trim();
        if (!commandValue) throw new Error("Command is required");
        setStep("read-eml");
        const text = await emlFile.text();
        const { default: initZkEmail } = await import("@zk-email/sdk");
        const { initNoirWasm } = await import("@zk-email/sdk/initNoirWasm");
        setStep("init-sdk");
        const sdk = initZkEmail({
          baseUrl: "https://dev-conductor.zk.email",
          logging: { enabled: true, level: "debug" },
        });
        setStep("get-blueprint");
        const blueprint = await sdk.getBlueprint("benceharomi/X_HANDLE@v2");
        // local noir circuit
        blueprint.getNoirCircuit = async () => {
          const data = await (await fetch("/x_handle_noir.json")).json();
          return data;
        };
        setStep("create-prover");
        const prover = blueprint.createProver({ isLocal: true });

        const externalInputs = [
          {
            name: "command",
            value: commandValue,
          },
        ];
        setStep("init-noir");
        const noirWasm = await initNoirWasm();
        setStep("generate-proof");
        const proof = await prover.generateProof(text, externalInputs, {
          noirWasm,
        });
        setStep("offchain-verification");
        const verification = await blueprint.verifyProof(proof, { noirWasm });

        // TODO: uncomment this when the onchain submission is ready
        // setStep("onchain-submit");
        // const proofData = `0x${proof.props.proofData!}` as `0x${string}`;
        // const publicOutputs = proof.props.publicOutputs! as `0x${string}`[];
        // const { data: encoded } = useReadContract({
        //   address: CONTRACTS.sepolia.linkXHandleVerifier,
        //   abi: entrypointAbi,
        //   functionName: "encode",
        //   args: [proofData, publicOutputs],
        // });
        // if (!encoded) throw new Error("Failed to encode proof");
        // writeContractAsync({
        //   abi: entrypointAbi,
        //   address: CONTRACTS.sepolia.linkXHandleVerifier,
        //   functionName: "entrypoint",
        //   args: [encoded],
        // });

        setResult({ proof, verification });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Twitter proof error at", step, e);
        setError(step ? `${msg} (at ${step})` : msg);
      } finally {
        setIsLoading(false);
      }
    },
    [step]
  );

  const json = useMemo(
    () => (result ? JSON.stringify(result, null, 2) : ""),
    [result]
  );

  return { isLoading, error, result, json, run } as const;
}
