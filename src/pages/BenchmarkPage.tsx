import { useEffect, useRef, useState } from "react";
import { NavBar } from "../components/NavBar";
import { ThemeToggle } from "../components/ThemeToggle";
import { ConnectKitButton } from "connectkit";
import { useBenchmark } from "../features/benchmark/useBenchmark";

export function BenchmarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [command, setCommand] = useState("Link my x handle to test");
  const [numRuns, setNumRuns] = useState<number | "">(5);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const {
    isRunning,
    error,
    summary,
    currentRun,
    totalRuns,
    runBenchmark,
    reset,
  } = useBenchmark();

  // Reset when file changes
  useEffect(() => {
    if (file) {
      reset();
    }
  }, [file, reset]);

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.toLowerCase().endsWith(".eml")) {
      handleFileSelect(droppedFile);
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms.toFixed(2)} ms`;
    }
    return `${(ms / 1000).toFixed(2)} s`;
  };

  return (
    <>
      <NavBar
        right={
          <>
            <ThemeToggle />
            <ConnectKitButton />
          </>
        }
      />
      <main>
        <section className="container hero">
          <h1 className="title">Proof Generation Benchmark</h1>
          <p className="subtitle">
            Benchmark local Noir proof generation performance using X/Twitter emails
          </p>

          <div
            style={{
              maxWidth: "600px",
              margin: "32px auto 0",
              display: "grid",
              gap: "20px",
            }}
          >
            {/* File Input */}
            <div>
              <label
                htmlFor="eml-file"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                }}
              >
                EML File
              </label>
              <p
                className="help-text"
                style={{
                  marginTop: 0,
                  marginBottom: "8px",
                  fontSize: "13px",
                  color: "var(--muted)",
                }}
              >
                Use any X/Twitter email (e.g., password reset, verification, notifications)
              </p>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${
                    isDragOver ? "#60a5fa" : "var(--border)"
                  }`,
                  borderRadius: "12px",
                  padding: "24px",
                  textAlign: "center",
                  background: isDragOver
                    ? "rgba(96, 165, 250, 0.05)"
                    : "var(--card)",
                  cursor: "pointer",
                  transition: "all 120ms ease",
                }}
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  id="eml-file"
                  accept=".eml"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0] || null;
                    handleFileSelect(selectedFile);
                  }}
                />
                {file ? (
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{file.name}</p>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: "12px",
                        color: "var(--muted)",
                      }}
                    >
                      Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: 0 }}>Click or drag .eml file here</p>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: "12px",
                        color: "var(--muted)",
                      }}
                    >
                      Select an email export file
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Command Input */}
            <div>
              <label
                htmlFor="command"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                }}
              >
                Command
              </label>
              <input
                id="command"
                type="text"
                className="input"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Link my x handle to test"
                disabled={isRunning}
                style={{ width: "100%" }}
              />
            </div>

            {/* Number of Runs Input */}
            <div>
              <label
                htmlFor="num-runs"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                }}
              >
                Number of Runs
              </label>
              <input
                id="num-runs"
                type="number"
                className="input"
                value={numRuns}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    setNumRuns("");
                  } else {
                    const numValue = parseInt(value, 10);
                    if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
                      setNumRuns(numValue);
                    }
                  }
                }}
                onBlur={(e) => {
                  // If empty on blur, reset to default value
                  if (e.target.value === "") {
                    setNumRuns(5);
                  }
                }}
                min={1}
                max={100}
                disabled={isRunning}
                style={{ width: "100%" }}
              />
              <p
                className="help-text"
                style={{ marginTop: "4px", marginBottom: 0 }}
              >
                Enter a number between 1 and 100
              </p>
            </div>

            {/* Run Button */}
            <div>
              <button
                className="nav-cta btn-primary"
                onClick={() => {
                  if (file && typeof numRuns === "number") {
                    runBenchmark(file, command, numRuns);
                  }
                }}
                disabled={!file || isRunning || !command.trim() || numRuns === ""}
                style={{
                  width: "100%",
                  height: "44px",
                  opacity: !file || isRunning || !command.trim() || numRuns === "" ? 0.5 : 1,
                  cursor: !file || isRunning || !command.trim() || numRuns === "" ? "not-allowed" : "pointer",
                }}
              >
                {isRunning
                  ? `Running ${currentRun}/${totalRuns}...`
                  : "Start Benchmark"}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div
                style={{
                  padding: "12px",
                  background: "rgba(220, 38, 38, 0.1)",
                  border: "1px solid rgba(220, 38, 38, 0.3)",
                  borderRadius: "8px",
                  color: "#dc2626",
                }}
              >
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Results Summary */}
            {summary && (
              <div
                className="card"
                style={{
                  marginTop: "8px",
                  padding: "24px",
                }}
              >
                <h3 style={{ margin: "0 0 16px", fontSize: "20px" }}>
                  Benchmark Results
                </h3>

                {/* Summary Stats */}
                <div style={{ marginBottom: "24px" }}>
                  <h4
                    style={{
                      margin: "0 0 12px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Total Time (Proof + Verification)
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: "16px",
                      marginBottom: "20px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          marginBottom: "4px",
                        }}
                      >
                        Average
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 600 }}>
                        {formatTime(summary.averageTimeMs)}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          marginBottom: "4px",
                        }}
                      >
                        Min
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 600 }}>
                        {formatTime(summary.minTimeMs)}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          marginBottom: "4px",
                        }}
                      >
                        Max
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 600 }}>
                        {formatTime(summary.maxTimeMs)}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          marginBottom: "4px",
                        }}
                      >
                        Success Rate
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 600 }}>
                        {summary.successCount}/{summary.results.length}
                      </div>
                    </div>
                  </div>

                  <h4
                    style={{
                      margin: "0 0 12px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Proof Generation Time
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: "16px",
                      marginBottom: "20px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          marginBottom: "4px",
                        }}
                      >
                        Average
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 600 }}>
                        {formatTime(summary.averageProofTimeMs)}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          marginBottom: "4px",
                        }}
                      >
                        Min
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 600 }}>
                        {formatTime(summary.minProofTimeMs)}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          marginBottom: "4px",
                        }}
                      >
                        Max
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 600 }}>
                        {formatTime(summary.maxProofTimeMs)}
                      </div>
                    </div>
                  </div>

                  <h4
                    style={{
                      margin: "0 0 12px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Verification Time
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          marginBottom: "4px",
                        }}
                      >
                        Average
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 600 }}>
                        {formatTime(summary.averageVerificationTimeMs)}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          marginBottom: "4px",
                        }}
                      >
                        Min
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 600 }}>
                        {formatTime(summary.minVerificationTimeMs)}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          marginBottom: "4px",
                        }}
                      >
                        Max
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 600 }}>
                        {formatTime(summary.maxVerificationTimeMs)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Results */}
                <div>
                  <h4
                    style={{
                      margin: "0 0 12px",
                      fontSize: "16px",
                      fontWeight: 600,
                    }}
                  >
                    Individual Runs
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gap: "8px",
                      maxHeight: "400px",
                      overflowY: "auto",
                    }}
                  >
                    {summary.results.map((result) => (
                      <div
                        key={result.runNumber}
                        style={{
                          padding: "12px",
                          background: result.success
                            ? "var(--card)"
                            : "rgba(220, 38, 38, 0.05)",
                          border: `1px solid ${
                            result.success
                              ? "var(--border)"
                              : "rgba(220, 38, 38, 0.3)"
                          }`,
                          borderRadius: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: result.success ? "8px" : "0",
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600 }}>
                              Run {result.runNumber}:
                            </span>
                            {!result.success && result.error && (
                              <span
                                style={{
                                  marginLeft: "8px",
                                  fontSize: "12px",
                                  color: "#dc2626",
                                }}
                              >
                                {result.error}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontWeight: 600,
                              color: result.success ? "var(--text)" : "#dc2626",
                            }}
                          >
                            Total: {formatTime(result.timeMs)}
                          </div>
                        </div>
                        {result.success && (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "16px",
                              fontSize: "13px",
                              color: "var(--muted)",
                            }}
                          >
                            <span>
                              Proof:{" "}
                              <span
                                style={{
                                  color: "var(--text)",
                                  fontWeight: 500,
                                }}
                              >
                                {formatTime(result.proofTimeMs)}
                              </span>
                            </span>
                            <span>
                              Verification:{" "}
                              <span
                                style={{
                                  color: "var(--text)",
                                  fontWeight: 500,
                                }}
                              >
                                {formatTime(result.verificationTimeMs)}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
