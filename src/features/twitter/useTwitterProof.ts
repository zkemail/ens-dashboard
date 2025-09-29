import { useCallback, useEffect, useMemo, useState } from "react";
import { Buffer as BufferPolyfill } from "buffer";
import { usePublicClient, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProofResult | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [step, setStep] = useState<string>("");
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

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
        // local noir circuit served from public/
        blueprint.getNoirCircuit = async () => {
          const url = `${import.meta.env.BASE_URL}x_handle_noir.json`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to load circuit at ${url}`);
          return await res.json();
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

        // Do not submit onchain here; return result and allow a later submit action
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

  const submit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (!result) throw new Error("Generate a proof first");
      if (!publicClient) throw new Error("Public client unavailable");
      setStep("onchain-encode");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proofAny: any = result.proof as any;
      const proofData = `0x${proofAny.props.proofData!}` as `0x${string}`;
      const publicOutputs = proofAny.props.publicOutputs! as `0x${string}`[];
      const encoded = await publicClient.readContract({
        address: CONTRACTS.sepolia.linkXHandleVerifier,
        abi: entrypointAbi,
        functionName: "encode",
        args: [proofData, publicOutputs],
      });
      setStep("onchain-submit");
      await writeContractAsync({
        abi: entrypointAbi,
        address: CONTRACTS.sepolia.linkXHandleVerifier,
        functionName: "entrypoint",
        args: [encoded],
      });
      // Mark as submitted immediately; do not wait for confirmations here
      setHasSubmitted(true);
      // Opportunistically refresh queries, but don't block UI
      void queryClient.invalidateQueries();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Twitter submit error at", step, e);
      setError(step ? `${msg} (at ${step})` : msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [result, publicClient, writeContractAsync, queryClient, step]);

  const json = useMemo(
    () => (result ? JSON.stringify(result, null, 2) : ""),
    [result]
  );

  // After submit, poll to refresh verification status so UI updates without reload
  useEffect(() => {
    if (!hasSubmitted) return;
    let stopped = false;
    const interval = setInterval(() => {
      if (stopped) return;
      void queryClient.invalidateQueries();
    }, 5000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [hasSubmitted, queryClient]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsSubmitting(false);
    setError(null);
    setResult(null);
    setHasSubmitted(false);
    setStep("");
  }, []);

  return {
    isLoading,
    isSubmitting,
    hasSubmitted,
    error,
    result,
    json,
    run,
    submit,
    reset,
  } as const;
}
