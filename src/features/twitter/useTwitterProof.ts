import { useCallback, useMemo, useState } from "react";
import { Buffer as BufferPolyfill } from "buffer";
import { submitProofWithZeroDev } from "../../utils/zerodev";

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
  const [submitResult, setSubmitResult] = useState<{
    userOpHash: string;
    transactionHash: string;
    accountAddress: string;
  } | null>(null);
  const [step, setStep] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  const run = useCallback(
    async (emlFile: File, command: string) => {
      setIsLoading(true);
      setError(null);
      setResult(null);
      setProgress(0);
      try {
        if (!emlFile) throw new Error("Please choose a .eml file");
        const fileOk = emlFile.name?.toLowerCase().endsWith(".eml");
        if (!fileOk) throw new Error("File must be a .eml email export");
        const commandValue = String(command || "").trim();
        if (!commandValue) throw new Error("Command is required");
        
        setStep("read-eml");
        setProgress(5);
        const text = await emlFile.text();
        
        setStep("loading-sdk");
        setProgress(10);
        const { default: initZkEmail } = await import("@zk-email/sdk");
        const { initNoirWasm } = await import("@zk-email/sdk/initNoirWasm");
        
        setStep("init-sdk");
        setProgress(20);
        const sdk = initZkEmail({
          baseUrl: "https://dev-conductor.zk.email",
          logging: { enabled: true, level: "debug" },
        });
        
        setStep("get-blueprint");
        setProgress(30);
        const blueprint = await sdk.getBlueprint("benceharomi/x_handle@v1");
        
        setStep("create-prover");
        setProgress(40);
        const prover = blueprint.createProver({ isLocal: true });

        const externalInputs = [
          {
            name: "command",
            value: commandValue,
          },
        ];
        
        setStep("init-noir");
        setProgress(50);
        const noirWasm = await initNoirWasm();
        
        setStep("generate-proof");
        setProgress(60);
        const proof = await prover.generateProof(text, externalInputs, {
          noirWasm,
        });
        
        setStep("offchain-verification");
        setProgress(90);
        const verification = await blueprint.verifyProof(proof, { noirWasm });

        setProgress(100);
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
    if (!result) {
      setError("No proof to submit. Please generate a proof first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setStep("submit-onchain");

    try {
      console.log("🔄 Starting onchain submission...");
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proofAny: any = result.proof as any;
      const proofData = `0x${proofAny.props.proofData!}` as `0x${string}`;
      const publicOutputs = proofAny.props.publicOutputs! as `0x${string}`[];

      console.log("📦 Extracted proof data:", proofData);
      console.log("📦 Extracted public outputs:", publicOutputs);

      const submitResult = await submitProofWithZeroDev(proofData, publicOutputs);
      
      setSubmitResult({
        userOpHash: submitResult.userOpHash,
        transactionHash: submitResult.transactionHash,
        accountAddress: submitResult.accountAddress,
      });
      
      console.log("✅ Submission successful!");
      setStep("submit-complete");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("❌ Submission error:", e);
      setError(`Submission failed: ${msg}`);
      setStep("submit-failed");
    } finally {
      setIsSubmitting(false);
    }
  }, [result]);

  const json = useMemo(
    () => (result ? JSON.stringify(result, null, 2) : ""),
    [result]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsSubmitting(false);
    setError(null);
    setResult(null);
    setSubmitResult(null);
    setStep("");
    setProgress(0);
  }, []);

  return {
    isLoading,
    isSubmitting,
    error,
    result,
    submitResult,
    json,
    step,
    progress,
    run,
    submit,
    reset,
  } as const;
}
