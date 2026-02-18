import { useCallback, useEffect, useMemo, useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { entrypointAbi } from "../records/abi";
import { remoteProve } from "./remoteProve";
import type { PlatformConfig } from "../../config/platforms";

type ProofResult = {
  proof: unknown;
  verification: unknown;
};

export function useProof(platform: PlatformConfig) {
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
      if (!platform.verifiable || !platform.blueprintSlug) {
        setError("This platform does not support proof verification.");
        return;
      }
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

        setStep("remote-proof-generation");
        const proof = await remoteProve(
          text,
          platform.blueprintSlug,
          commandValue,
        );

        setResult({ proof, verification: { verified: true } });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`${platform.label} proof error at`, step, e);
        setError(step ? `${msg} (at ${step})` : msg);
      } finally {
        setIsLoading(false);
      }
    },
    [step, platform.blueprintSlug, platform.label],
  );

  const submit = useCallback(async () => {
    if (!platform.verifiable || !platform.verifierAddress) {
      setError("This platform does not support on-chain verification.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      if (!result) throw new Error("Generate a proof first");
      if (!publicClient) throw new Error("Public client unavailable");
      setStep("onchain-encode");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proofAny: any = result.proof as any;
      const rawProofData = proofAny.props.proofData! as string;
      const proofData = (
        rawProofData.startsWith("0x") ? rawProofData : `0x${rawProofData}`
      ) as `0x${string}`;
      const publicOutputs = proofAny.props.publicOutputs! as `0x${string}`[];
      const encoded = await publicClient.readContract({
        address: platform.verifierAddress,
        abi: entrypointAbi,
        functionName: "encode",
        args: [proofData, publicOutputs],
      });
      setStep("onchain-submit");
      await writeContractAsync({
        abi: entrypointAbi,
        address: platform.verifierAddress,
        functionName: "entrypoint",
        args: [encoded],
      });
      setHasSubmitted(true);
      void queryClient.invalidateQueries();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${platform.label} submit error at`, step, e);
      setError(step ? `${msg} (at ${step})` : msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [result, publicClient, writeContractAsync, queryClient, step, platform.verifierAddress, platform.label]);

  const json = useMemo(
    () => (result ? JSON.stringify(result, null, 2) : ""),
    [result],
  );

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
    step,
    run,
    submit,
    reset,
    setResult,
  } as const;
}
