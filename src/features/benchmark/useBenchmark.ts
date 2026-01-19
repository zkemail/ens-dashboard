import { useCallback, useState } from "react";
import { Buffer as BufferPolyfill } from "buffer";

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

export type BenchmarkResult = {
  runNumber: number;
  timeMs: number; // Total time (proof + verification)
  proofTimeMs: number;
  verificationTimeMs: number;
  success: boolean;
  error?: string;
};

export type BenchmarkSummary = {
  results: BenchmarkResult[];
  averageTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  averageProofTimeMs: number;
  minProofTimeMs: number;
  maxProofTimeMs: number;
  averageVerificationTimeMs: number;
  minVerificationTimeMs: number;
  maxVerificationTimeMs: number;
  successCount: number;
  failureCount: number;
};

export function useBenchmark() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BenchmarkSummary | null>(null);
  const [currentRun, setCurrentRun] = useState(0);
  const [totalRuns, setTotalRuns] = useState(0);

  const runBenchmark = useCallback(
    async (emlFile: File, command: string, numRuns: number) => {
      setIsRunning(true);
      setError(null);
      setSummary(null);
      setCurrentRun(0);
      setTotalRuns(numRuns);

      const results: BenchmarkResult[] = [];

      try {
        if (!emlFile) throw new Error("Please choose a .eml file");
        const fileOk = emlFile.name?.toLowerCase().endsWith(".eml");
        if (!fileOk) throw new Error("File must be a .eml email export");
        const commandValue = String(command || "").trim();
        if (!commandValue) throw new Error("Command is required");
        if (numRuns < 1) throw new Error("Number of runs must be at least 1");
        if (numRuns > 100) throw new Error("Number of runs cannot exceed 100");

        // Read EML file once
        const text = await emlFile.text();

        // Initialize SDK and Noir once (outside the loop for efficiency)
        const { default: initZkEmail } = await import("@zk-email/sdk");
        const { initNoirWasm } = await import("@zk-email/sdk/initNoirWasm");
        const sdk = initZkEmail({
          baseUrl: "https://dev-conductor.zk.email",
          logging: { enabled: false, level: "info" },
        });
        const blueprint = await sdk.getBlueprint("benceharomi/X_HANDLE@v2");
        // local noir circuit served from public/
        blueprint.getNoirCircuit = async () => {
          const url = `${import.meta.env.BASE_URL}x_handle_noir.json`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to load circuit at ${url}`);
          return await res.json();
        };
        const prover = blueprint.createProver({ isLocal: true });
        const noirWasm = await initNoirWasm();

        const externalInputs = [
          {
            name: "command",
            value: commandValue,
          },
        ];

        // Run benchmark multiple times
        for (let i = 0; i < numRuns; i++) {
          setCurrentRun(i + 1);
          const startTime = performance.now();

          let proofTimeMs = 0;
          let verificationTimeMs = 0;

          try {
            // Generate proof (measure separately)
            const proofStartTime = performance.now();
            const proof = await prover.generateProof(text, externalInputs, {
              noirWasm,
            });
            const proofEndTime = performance.now();
            proofTimeMs = proofEndTime - proofStartTime;

            // Verify proof (measure separately)
            const verificationStartTime = performance.now();
            await blueprint.verifyProof(proof, { noirWasm });
            const verificationEndTime = performance.now();
            verificationTimeMs = verificationEndTime - verificationStartTime;

            const endTime = performance.now();
            const timeMs = endTime - startTime;

            results.push({
              runNumber: i + 1,
              timeMs,
              proofTimeMs,
              verificationTimeMs,
              success: true,
            });
          } catch (e) {
            const endTime = performance.now();
            const timeMs = endTime - startTime;
            const msg = e instanceof Error ? e.message : String(e);

            // Capture partial timing: if proof succeeded but verification failed,
            // proofTimeMs will be set; if proof failed, both remain 0
            results.push({
              runNumber: i + 1,
              timeMs,
              proofTimeMs,
              verificationTimeMs,
              success: false,
              error: msg,
            });
          }
        }

        // Calculate summary
        const successfulResults = results.filter((r) => r.success);
        const times = successfulResults.map((r) => r.timeMs);
        const proofTimes = successfulResults.map((r) => r.proofTimeMs);
        const verificationTimes = successfulResults.map(
          (r) => r.verificationTimeMs
        );

        const averageTimeMs =
          times.length > 0
            ? times.reduce((sum, t) => sum + t, 0) / times.length
            : 0;
        const minTimeMs = times.length > 0 ? Math.min(...times) : 0;
        const maxTimeMs = times.length > 0 ? Math.max(...times) : 0;

        const averageProofTimeMs =
          proofTimes.length > 0
            ? proofTimes.reduce((sum, t) => sum + t, 0) / proofTimes.length
            : 0;
        const minProofTimeMs =
          proofTimes.length > 0 ? Math.min(...proofTimes) : 0;
        const maxProofTimeMs =
          proofTimes.length > 0 ? Math.max(...proofTimes) : 0;

        const averageVerificationTimeMs =
          verificationTimes.length > 0
            ? verificationTimes.reduce((sum, t) => sum + t, 0) /
              verificationTimes.length
            : 0;
        const minVerificationTimeMs =
          verificationTimes.length > 0 ? Math.min(...verificationTimes) : 0;
        const maxVerificationTimeMs =
          verificationTimes.length > 0 ? Math.max(...verificationTimes) : 0;

        setSummary({
          results,
          averageTimeMs,
          minTimeMs,
          maxTimeMs,
          averageProofTimeMs,
          minProofTimeMs,
          maxProofTimeMs,
          averageVerificationTimeMs,
          minVerificationTimeMs,
          maxVerificationTimeMs,
          successCount: successfulResults.length,
          failureCount: results.length - successfulResults.length,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Benchmark error:", e);
        setError(msg);
      } finally {
        setIsRunning(false);
        setCurrentRun(0);
        setTotalRuns(0);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsRunning(false);
    setError(null);
    setSummary(null);
    setCurrentRun(0);
    setTotalRuns(0);
  }, []);

  return {
    isRunning,
    error,
    summary,
    currentRun,
    totalRuns,
    runBenchmark,
    reset,
  } as const;
}
