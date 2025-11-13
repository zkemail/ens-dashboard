import { useEffect, useMemo, useRef, useState } from "react";
import { type Address, formatEther, isAddress } from "viem";
import {
  handleToEnsName,
  resolveEnsToPredictedAddress,
  getSepoliaBalance,
  truncateMiddle,
} from "../../utils/ens";
import { useTwitterProof } from "../twitter/useTwitterProof";

export default function Claim() {
  const [handle, setHandle] = useState("");
  const ensName = useMemo(() => handleToEnsName(handle), [handle]);
  const [resolvedAddress, setResolvedAddress] = useState<Address | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);

  const [withdrawTo, setWithdrawTo] = useState<Address | "">("");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const {
    isLoading,
    isSubmitting,
    error,
    result,
    submitResult,
    step,
    run,
    submit,
    reset,
  } = useTwitterProof();

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

  const canGenerate = !!file && isAddress(withdrawTo || "0x") && !isLoading;

  const handleGenerate = () => {
    if (!file || !withdrawTo) return;
    const cmd = `Withdraw all eth to ${withdrawTo}`;
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          display: "grid",
          gap: "20px",
        }}
      >
        <header style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "28px", margin: 0, fontWeight: 700 }}>
            Claim your tips
          </h1>
          <p className="help-text" style={{ marginTop: "6px" }}>
            Verify ownership of your X handle via password reset email and
            withdraw to any address.
          </p>
        </header>

        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px",
            display: "grid",
            gap: "14px",
          }}
        >
          <label htmlFor="handle" style={{ fontWeight: 500 }}>
            X handle
          </label>
          <input
            id="handle"
            type="text"
            placeholder="@your_handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--background)",
              color: "var(--text)",
            }}
          />

          {ensName && (
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <div className="help-text" style={{ marginBottom: 4 }}>
                    ENS name
                  </div>
                  <div style={{ fontFamily: "ui-monospace, monospace" }}>
                    {ensName}
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <div className="help-text" style={{ marginBottom: 4 }}>
                    Account address
                  </div>
                  <div style={{ fontFamily: "ui-monospace, monospace" }}>
                    {isResolving ? "Resolving..." : resolvedAddress ?? "—"}
                  </div>
                </div>
              </div>
              {resolvedAddress != null && balance != null && (
                <div className="help-text">
                  Balance: {Number(formatEther(balance)).toFixed(6)} ETH
                </div>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px",
            display: "grid",
            gap: "14px",
          }}
        >
          <label htmlFor="to" style={{ fontWeight: 500 }}>
            Withdraw to (Ethereum address)
          </label>
          <input
            id="to"
            type="text"
            placeholder="0x..."
            value={withdrawTo}
            onChange={(e) => setWithdrawTo(e.target.value as Address)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--background)",
              color: "var(--text)",
              fontFamily: "ui-monospace, monospace",
            }}
          />

          <div>
            <label
              style={{ display: "block", marginBottom: 8, fontWeight: 500 }}
            >
              Upload X password reset email (.eml)
            </label>
            <div
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              style={{
                border: "2px dashed var(--border)",
                borderRadius: "8px",
                padding: "18px",
                textAlign: "center",
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
            >
              <div className="help-text" style={{ marginBottom: "8px" }}>
                {file
                  ? `✓ Selected: ${file.name}`
                  : "Click to choose .eml file"}
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
              className="help-text"
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <div>Step: {step || (isLoading ? "Processing..." : "Done")}</div>
              <div>{result ? "Proof ready" : "Working..."}</div>
            </div>
          )}
          {error && (
            <div
              className="help-text"
              role="alert"
              style={{
                padding: "10px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "6px",
              }}
            >
              {String(error)}
            </div>
          )}
          {submitResult && (
            <div
              className="help-text"
              role="status"
              style={{
                padding: "10px",
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "6px",
              }}
            >
              <div style={{ marginBottom: 6 }}>
                Withdrawal submitted from{" "}
                {truncateMiddle(submitResult.accountAddress)}.
              </div>
              <div>
                Tx:{" "}
                <a
                  href={`https://sepolia.etherscan.io/tx/${submitResult.transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "rgb(59, 130, 246)",
                    textDecoration: "underline",
                  }}
                >
                  {truncateMiddle(submitResult.transactionHash)}
                </a>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            {!result ? (
              <button
                className="nav-cta"
                onClick={handleGenerate}
                disabled={!canGenerate}
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
                  {isSubmitting ? "Submitting..." : "Submit Withdraw"}
                </button>
              </>
            ) : (
              <button
                className="nav-cta"
                onClick={handleReset}
                style={{ flex: 1 }}
              >
                Withdraw Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
