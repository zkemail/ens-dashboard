import { useEffect, useMemo, useRef, useState } from "react";
import { type Address, formatEther } from "viem";
import {
  handleToEnsName,
  resolveEnsToPredictedAddress,
  getSepoliaBalance,
  resolveEnsOrAddress,
} from "../../utils/ens";
import { useGithubProof } from "../github/useGithubProof";
import { useDebounce } from "../../hooks/useDebounce";

function getStepLabel(step: string): string {
  const labels: Record<string, string> = {
    "read-eml": "Reading email file...",
    "loading-sdk": "Loading cryptography libraries...",
    "init-sdk": "Initializing SDK...",
    "get-blueprint": "Fetching verification blueprint...",
    "create-prover": "Setting up prover...",
    "init-noir": "Initializing zero-knowledge engine...",
    "generate-proof": "Generating proof (this may take a minute)...",
    "offchain-verification": "Verifying proof...",
  };
  return labels[step] || "Processing...";
}

export default function Claim() {
  const [handle, setHandle] = useState("");
  const debouncedHandle = useDebounce(handle, 500);
  const ensName = useMemo(
    () => handleToEnsName(debouncedHandle),
    [debouncedHandle]
  );
  const [resolvedAddress, setResolvedAddress] = useState<Address | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const [withdrawTo, setWithdrawTo] = useState<string>("");
  const debouncedWithdrawTo = useDebounce(withdrawTo, 500);
  const [resolvedWithdrawAddress, setResolvedWithdrawAddress] =
    useState<Address | null>(null);
  const [isResolvingWithdraw, setIsResolvingWithdraw] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const {
    isLoading,
    isSubmitting,
    error,
    result,
    submitResult,
    step,
    progress,
    run,
    submit,
    reset,
  } = useGithubProof();

  useEffect(() => {
    let cancelled = false;
    async function runResolve() {
      setIsResolving(true);
      setResolvedAddress(null);
      setBalance(null);
      const addr = await resolveEnsToPredictedAddress(ensName);
      if (cancelled) return;
      setResolvedAddress(addr);
      if (addr) {
        const bal = await getSepoliaBalance(addr);
        if (!cancelled) setBalance(bal);
      }
      setIsResolving(false);
    }
    if (ensName) runResolve();
    else {
      setResolvedAddress(null);
      setBalance(null);
    }
    return () => {
      cancelled = true;
    };
  }, [ensName]);

  // Resolve withdrawal address (ENS or direct address)
  useEffect(() => {
    let cancelled = false;
    async function resolveWithdraw() {
      setIsResolvingWithdraw(true);
      setResolvedWithdrawAddress(null);
      const addr = await resolveEnsOrAddress(debouncedWithdrawTo);
      if (cancelled) return;
      setResolvedWithdrawAddress(addr);
      setIsResolvingWithdraw(false);
    }
    if (debouncedWithdrawTo) resolveWithdraw();
    else {
      setResolvedWithdrawAddress(null);
      setIsResolvingWithdraw(false);
    }
    return () => {
      cancelled = true;
    };
  }, [debouncedWithdrawTo]);

  const canGenerate = !!file && !!resolvedWithdrawAddress && !isLoading;

  const handleGenerate = () => {
    if (!file || !resolvedWithdrawAddress) return;
    const cmd = `Withdraw all eth to ${resolvedWithdrawAddress}`;
    run(file, cmd);
  };

  const handleReset = () => {
    reset();
    setFile(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          margin: "0 auto",
          display: "grid",
          gap: "32px",
        }}
      >
        {/* Hero Section */}
        <header style={{ textAlign: "center", paddingTop: "20px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px",
              padding: "10px 20px",
              background: "rgba(34, 197, 94, 0.08)",
              borderRadius: "999px",
              border: "1px solid rgba(34, 197, 94, 0.2)",
            }}
          >
            <span style={{ fontSize: "14px", color: "var(--muted)" }}>
              Powered by
            </span>
            <img
              src="/ZKEmailLogo-light.svg"
              alt="ZK Email"
              style={{
                height: "20px",
              }}
            />
          </div>
          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 48px)",
              margin: "0 0 16px",
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            Claim Your{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Tips
            </span>
          </h1>
          <p
            style={{
              marginTop: "12px",
              fontSize: "17px",
              color: "var(--muted)",
              maxWidth: "520px",
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Verify your GitHub account ownership and withdraw your funds securely
          </p>

          {/* Feature badges */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              justifyContent: "center",
              marginTop: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "999px",
                fontSize: "13px",
              }}
            >
              <span>🔐</span>
              <span>Secure</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "999px",
                fontSize: "13px",
              }}
            >
              <span>✉️</span>
              <span>Email Verified</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "999px",
                fontSize: "13px",
              }}
            >
              <span>🌍</span>
              <span>Withdraw Anywhere</span>
            </div>
          </div>
        </header>

        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "24px",
            display: "grid",
            gap: "18px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div>
            <label
              htmlFor="handle"
              style={{ fontWeight: 500, fontSize: "15px" }}
            >
              Your GitHub handle
            </label>
            <input
              id="handle"
              type="text"
              placeholder="e.g., @your_handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--background)",
                color: "var(--text)",
                fontSize: "15px",
                marginTop: "8px",
              }}
            />
          </div>

          {ensName && isResolving && (
            <div
              style={{
                padding: "16px",
                textAlign: "center",
                color: "var(--muted)",
              }}
            >
              Checking your balance...
            </div>
          )}

          {ensName && resolvedAddress && balance != null && (
            <div
              style={{
                padding: "18px",
                background: "rgba(34, 197, 94, 0.08)",
                border: "1px solid rgba(34, 197, 94, 0.2)",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "28px",
                  marginBottom: "8px",
                  fontWeight: 600,
                }}
              >
                {Number(formatEther(balance)).toFixed(4)} ETH
              </div>
              <div className="help-text">Available to withdraw</div>

              <button
                className="link-cta"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                style={{ justifyContent: "center", marginTop: "12px" }}
              >
                {showTechnicalDetails ? "Hide" : "Show"} wallet address
              </button>

              {showTechnicalDetails && resolvedAddress && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px",
                    background: "var(--card)",
                    borderRadius: "8px",
                    fontSize: "13px",
                    textAlign: "left",
                  }}
                >
                  <div
                    className="help-text"
                    style={{ marginBottom: 4, fontSize: "11px" }}
                  >
                    Wallet Address
                  </div>
                  <div
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      wordBreak: "break-all",
                      fontSize: "12px",
                    }}
                  >
                    {resolvedAddress}
                  </div>
                </div>
              )}
            </div>
          )}

          {ensName && !isResolving && !resolvedAddress && (
            <div
              style={{
                padding: "16px",
                background: "rgba(234, 179, 8, 0.08)",
                border: "1px solid rgba(234, 179, 8, 0.2)",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <div style={{ marginBottom: "6px" }}>⚠️ Handle not found</div>
              <div className="help-text">
                This GitHub handle hasn't set up their account yet
              </div>
            </div>
          )}
        </div>

        {/* Only show withdrawal options if we have a resolved address and balance */}
        {resolvedAddress && balance != null && (
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "24px",
              display: "grid",
              gap: "18px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              animation: "slideIn 0.3s ease-out",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>
              Choose Withdrawal Method
            </h3>

            <div style={{ display: "grid", gap: "10px" }}>
              {/* Ethereum - Active */}
              <div
                style={{
                  padding: "16px",
                  background: "rgba(96, 165, 250, 0.1)",
                  border: "2px solid rgb(96, 165, 250)",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                    }}
                  >
                    ⟠
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>Ethereum Wallet</div>
                    <div className="help-text" style={{ fontSize: "12px" }}>
                      Withdraw to any address or ENS name
                    </div>
                  </div>
                </div>
                <input
                  id="to"
                  type="text"
                  placeholder="Address or ENS name (e.g., vitalik.eth or 0x...)"
                  value={withdrawTo}
                  onChange={(e) => setWithdrawTo(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--text)",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "13px",
                  }}
                />

                {/* ENS Resolution Feedback */}
                {withdrawTo && (
                  <div style={{ marginTop: "8px", fontSize: "12px" }}>
                    {isResolvingWithdraw && (
                      <div className="help-text">Resolving address...</div>
                    )}
                    {!isResolvingWithdraw && resolvedWithdrawAddress && (
                      <div
                        style={{
                          padding: "8px 12px",
                          background: "rgba(34, 197, 94, 0.1)",
                          border: "1px solid rgba(34, 197, 94, 0.3)",
                          borderRadius: "6px",
                          color: "#16a34a",
                        }}
                      >
                        ✓ Resolved to: {resolvedWithdrawAddress}
                      </div>
                    )}
                    {!isResolvingWithdraw &&
                      !resolvedWithdrawAddress &&
                      withdrawTo.trim() && (
                        <div
                          style={{
                            padding: "8px 12px",
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            borderRadius: "6px",
                            color: "#dc2626",
                          }}
                        >
                          ⚠️ Invalid address or ENS name
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Bank Account - Coming Soon */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px",
                  background: "rgba(148, 163, 184, 0.1)",
                  border: "1px solid rgba(148, 163, 184, 0.3)",
                  borderRadius: "12px",
                  opacity: 0.6,
                  cursor: "not-allowed",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "#10b981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                    }}
                  >
                    🏦
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 500 }}>Bank Account</div>
                    <div className="help-text" style={{ fontSize: "12px" }}>
                      Direct bank transfer
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    padding: "4px 8px",
                    background: "rgba(234, 179, 8, 0.15)",
                    borderRadius: "6px",
                    color: "#a16207",
                    fontWeight: 500,
                  }}
                >
                  Coming Soon
                </div>
              </div>

              {/* PayPal - Coming Soon */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px",
                  background: "rgba(148, 163, 184, 0.1)",
                  border: "1px solid rgba(148, 163, 184, 0.3)",
                  borderRadius: "12px",
                  opacity: 0.6,
                  cursor: "not-allowed",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "#0070ba",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "11px",
                    }}
                  >
                    PP
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 500 }}>PayPal</div>
                    <div className="help-text" style={{ fontSize: "12px" }}>
                      Withdraw to PayPal
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    padding: "4px 8px",
                    background: "rgba(234, 179, 8, 0.15)",
                    borderRadius: "6px",
                    color: "#a16207",
                    fontWeight: 500,
                  }}
                >
                  Coming Soon
                </div>
              </div>

              {/* Venmo - Coming Soon */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px",
                  background: "rgba(148, 163, 184, 0.1)",
                  border: "1px solid rgba(148, 163, 184, 0.3)",
                  borderRadius: "12px",
                  opacity: 0.6,
                  cursor: "not-allowed",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "#3d95ce",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "11px",
                    }}
                  >
                    V
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 500 }}>Venmo</div>
                    <div className="help-text" style={{ fontSize: "12px" }}>
                      Withdraw to Venmo
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    padding: "4px 8px",
                    background: "rgba(234, 179, 8, 0.15)",
                    borderRadius: "6px",
                    color: "#a16207",
                    fontWeight: 500,
                  }}
                >
                  Coming Soon
                </div>
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 500,
                  fontSize: "15px",
                }}
              >
                Verify your GitHub account
              </label>
              <div className="help-text" style={{ marginBottom: "12px" }}>
                Upload your GitHub password reset email to prove ownership
              </div>
              <div
                onClick={() => !isLoading && inputRef.current?.click()}
                role="button"
                tabIndex={0}
                style={{
                  border: file
                    ? "2px solid rgba(34, 197, 94, 0.3)"
                    : "2px dashed var(--border)",
                  borderRadius: "12px",
                  padding: "20px",
                  textAlign: "center",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  background: file ? "rgba(34, 197, 94, 0.05)" : "transparent",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    fontSize: "32px",
                    marginBottom: "8px",
                  }}
                >
                  {file ? "✓" : "📧"}
                </div>
                <div style={{ marginBottom: "8px", fontWeight: 500 }}>
                  {file ? file.name : "Click to upload email"}
                </div>
                <div className="help-text">
                  {file ? "Email ready" : "Choose your .eml file"}
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".eml"
                  style={{ display: "none" }}
                  disabled={isLoading}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            {(isLoading || result) && (
              <div
                style={{
                  padding: "16px",
                  background: "rgba(96, 165, 250, 0.08)",
                  border: "1px solid rgba(96, 165, 250, 0.2)",
                  borderRadius: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: isLoading ? "12px" : 0,
                  }}
                >
                  <span className="help-text">
                    {isLoading ? getStepLabel(step) : "✓ Proof ready"}
                  </span>
                  {isLoading && (
                    <span className="help-text" style={{ fontWeight: 500 }}>
                      {progress}%
                    </span>
                  )}
                </div>
                {isLoading && (
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      background: "rgba(148, 163, 184, 0.2)",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: "100%",
                        background:
                          "linear-gradient(90deg, rgb(96, 165, 250), rgb(139, 92, 246))",
                        borderRadius: "999px",
                        transition: "width 0.3s ease-out",
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            {error && (
              <div
                role="alert"
                style={{
                  padding: "14px",
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: "10px",
                }}
              >
                <div style={{ marginBottom: "4px", fontWeight: 500 }}>
                  ❌ Error
                </div>
                <div className="help-text">{String(error)}</div>
              </div>
            )}
            {submitResult && (
              <div
                role="status"
                style={{
                  padding: "16px",
                  background: "rgba(34, 197, 94, 0.08)",
                  border: "1px solid rgba(34, 197, 94, 0.25)",
                  borderRadius: "10px",
                }}
              >
                <div style={{ fontSize: "20px", marginBottom: "8px" }}>🎉</div>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>
                  Withdrawal successful!
                </div>
                <div className="help-text" style={{ marginBottom: 8 }}>
                  Your funds have been sent
                </div>
                <a
                  href={`https://sepolia.etherscan.io/tx/${submitResult.transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn"
                  style={{
                    display: "inline-flex",
                    marginTop: "8px",
                    textDecoration: "none",
                  }}
                >
                  View on Etherscan →
                </a>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: "8px" }}>
              {!result ? (
                <button
                  className="btn btn-primary"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  style={{ flex: 1 }}
                >
                  {isLoading ? "Processing..." : "Start Withdrawal"}
                </button>
              ) : !submitResult ? (
                <>
                  <button
                    className="btn btn-ghost"
                    onClick={handleReset}
                    disabled={isSubmitting}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={submit}
                    disabled={isSubmitting}
                    style={{ flex: 1 }}
                  >
                    {isSubmitting ? "Confirming..." : "Confirm Withdrawal"}
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleReset}
                  style={{ flex: 1 }}
                >
                  Withdraw Again
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
