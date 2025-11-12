import "./App.css";
import { useEffect, useRef, useState } from "react";
import { useTwitterProof } from "./features/twitter/useTwitterProof";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [command, setCommand] = useState<string>(
    "Withdraw all eth to 0xafbd210c60dd651892a61804a989eef7bd63cba0"
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { isLoading, isSubmitting, error, result, submitResult, json, step, run, submit, reset } =
    useTwitterProof();

  // Progress bar: approaches 100% with a 10s half-life while generating,
  // then jumps to 100% when proof is ready.
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    let interval: number | undefined;
    if (isLoading && !result) {
      if (startRef.current == null) startRef.current = Date.now();
      interval = window.setInterval(() => {
        const startedAt = startRef.current ?? Date.now();
        const seconds = (Date.now() - startedAt) / 1000;
        const progressToHundred = 100 * (1 - Math.pow(0.5, seconds / 10));
        setProgress(Math.min(99, progressToHundred));
      }, 120);
    } else if (!isLoading && result) {
      setProgress(100);
      startRef.current = null;
    } else if (!isLoading && !result) {
      setProgress(0);
      startRef.current = null;
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isLoading, result]);

  const handleGenerate = () => {
    if (!file) return;
    run(file, command);
  };

  const handleReset = () => {
    reset();
    setFile(null);
    setProgress(0);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          width: "100%",
          display: "grid",
          gap: "24px",
        }}
      >
        <header style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              marginBottom: "8px",
            }}
          >
            Twitter/X Proof Generator
          </h1>
          <p className="help-text">
            Generate ZK Email proofs for your X/Twitter handle
          </p>
        </header>

        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "24px",
            display: "grid",
            gap: "20px",
          }}
        >
          <div>
            <label
              htmlFor="command"
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
              }}
            >
              Command
            </label>
            <input
              id="command"
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter command"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--background)",
                color: "var(--text)",
                fontSize: "14px",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
              }}
            >
              Email File (.eml)
            </label>
            <ol
              className="help-text"
              style={{ margin: "0 0 12px 0", paddingLeft: "18px" }}
            >
              <li>Request a password reset email from X/Twitter</li>
              <li>In your email client, download the email as .eml</li>
              <li>Drop the .eml file below or click to choose</li>
            </ol>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) setFile(dropped);
              }}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              style={{
                border: "2px dashed var(--border)",
                borderRadius: "8px",
                padding: "32px 16px",
                textAlign: "center",
                background: isDragOver
                  ? "rgba(96, 165, 250, 0.1)"
                  : "transparent",
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              <div className="help-text" style={{ marginBottom: "12px" }}>
                {file
                  ? `✓ Selected: ${file.name}`
                  : "📎 Drag & drop .eml here or click to choose"}
              </div>
              <button
                type="button"
                className="link-cta"
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                Choose file
              </button>
              <input
                ref={inputRef}
                id="eml-file"
                type="file"
                accept=".eml"
                style={{ display: "none" }}
                disabled={isLoading}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {(isLoading || result) && (
            <div style={{ display: "grid", gap: "6px" }}>
              <div
                aria-hidden
                style={{
                  height: "10px",
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, Math.round(progress)))}%`,
                    height: "100%",
                    background: isLoading ? "#60a5fa" : "#16a34a",
                    transition: "width 160ms ease",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span className="help-text">
                  {step ? `Step: ${step}` : "Processing..."}
                </span>
                <span className="help-text">
                  {Math.min(100, Math.max(0, Math.round(progress)))}%
                </span>
              </div>
            </div>
          )}

          {error && (
            <div
              className="help-text error"
              role="alert"
              style={{
                padding: "12px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "6px",
              }}
            >
              ❌ {error}
            </div>
          )}

          {result && !submitResult && (
            <div
              className="help-text"
              role="status"
              style={{
                padding: "12px",
                background: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                borderRadius: "6px",
              }}
            >
              ✅ Proof generated successfully!
            </div>
          )}

          {submitResult && (
            <div
              className="help-text"
              role="status"
              style={{
                padding: "12px",
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "6px",
              }}
            >
              <div style={{ marginBottom: "8px" }}>
                🎉 Proof submitted successfully!
              </div>
              <div style={{ fontSize: "12px", wordBreak: "break-all" }}>
                <strong>Account:</strong> {submitResult.accountAddress}
              </div>
              <div style={{ fontSize: "12px", wordBreak: "break-all", marginTop: "4px" }}>
                <strong>Transaction Hash:</strong> {submitResult.transactionHash}
              </div>
              <div style={{ fontSize: "12px", wordBreak: "break-all", marginTop: "4px" }}>
                <strong>UserOp Hash:</strong> {submitResult.userOpHash}
              </div>
              <div style={{ marginTop: "8px" }}>
                <a
                  href={`https://sepolia.etherscan.io/tx/${submitResult.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "rgb(59, 130, 246)", textDecoration: "underline" }}
                >
                  View on Etherscan →
                </a>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            {!result ? (
              <button
                className="nav-cta"
                onClick={handleGenerate}
                disabled={!file || !command.trim() || isLoading}
                style={{ flex: 1 }}
              >
                {isLoading ? "Generating..." : "Generate Proof"}
              </button>
            ) : !submitResult ? (
              <>
                <button
                  className="link-cta"
                  onClick={handleReset}
                  disabled={isSubmitting}
                  style={{ flex: 1 }}
                >
                  Reset
                </button>
                <button
                  className="nav-cta"
                  onClick={submit}
                  disabled={isSubmitting}
                  style={{ flex: 1 }}
                >
                  {isSubmitting ? "Submitting..." : "Submit Onchain"}
                </button>
              </>
            ) : (
              <button
                className="nav-cta"
                onClick={handleReset}
                style={{ flex: 1 }}
              >
                Generate Another
              </button>
            )}
          </div>

          {result && json && (
            <details style={{ marginTop: "8px" }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: "500",
                  marginBottom: "8px",
                }}
              >
                View Proof JSON
              </summary>
              <pre
                style={{
                  padding: "12px",
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  overflow: "auto",
                  maxHeight: "300px",
                }}
              >
                {json}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
