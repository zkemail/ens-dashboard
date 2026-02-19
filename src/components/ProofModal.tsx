import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";

/** The shape every proof hook must expose to work with this modal. */
export interface ProofHookApi {
  isLoading: boolean;
  isSubmitting: boolean;
  hasSubmitted: boolean;
  error: string | null;
  result: unknown;
  step: string;
  run: (file: File, command: string) => Promise<void>;
  submit: () => Promise<void>;
  reset: () => void;
}

export interface ProofModalProps {
  open: boolean;
  onClose: () => void;
  ensName?: string;
  onSubmitted?: () => void;

  /** Display name shown in the title & instructions, e.g. "Discord", "X" */
  platformName: string;

  /**
   * Expected proving duration in milliseconds. The progress bar is calibrated
   * so it reaches ~95 % at this time and caps at 99 % until the proof arrives.
   * Example: 120_000 for ~2 minutes.
   */
  estimatedDurationMs: number;

  /** Command template — receives the ENS name, e.g. name => `Link my discord handle to ${name}` */
  buildCommand: (ensName: string) => string;

  /** The proof hook instance returned by useProof(platform) */
  hook: ProofHookApi;
}

function friendlyError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("user denied") || lower.includes("user rejected"))
    return "Transaction rejected by wallet.";
  if (lower.includes("insufficient funds"))
    return "Insufficient funds to cover gas.";
  if (lower.includes("nonce"))
    return "Transaction nonce error. Please try again.";
  if (lower.includes("reverted") || lower.includes("revert"))
    return "Transaction reverted by the contract. The proof may be invalid or already used.";
  if (lower.includes("network") || lower.includes("fetch"))
    return "Network error. Please check your connection and try again.";
  if (lower.includes("timeout")) return "Request timed out. Please try again.";
  if (lower.includes("file must be")) return raw;
  if (lower.includes("please choose")) return raw;
  // Fallback: take first sentence or cap at 120 chars
  const firstSentence = raw.split(/\.\s/)[0];
  if (firstSentence.length <= 120)
    return firstSentence + (firstSentence.endsWith(".") ? "" : ".");
  return raw.slice(0, 120) + "…";
}

function stepLabel(step: string): string {
  switch (step) {
    case "read-eml":
      return "Reading email file…";
    case "remote-proof-generation":
      return "Generating proof on server…";
    case "onchain-encode":
      return "Encoding proof for on-chain submission…";
    case "onchain-submit":
      return "Submitting transaction on-chain…";
    default:
      return "";
  }
}

export function ProofModal({
  open,
  onClose,
  ensName,
  onSubmitted,
  platformName,
  estimatedDurationMs,
  buildCommand,
  hook,
}: ProofModalProps) {
  const {
    isLoading,
    isSubmitting,
    hasSubmitted,
    error,
    result,
    step,
    run,
    submit,
    reset,
  } = hook;

  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const startRef = useRef<number | null>(null);

  // Half-life calibrated so that at t = estimatedDurationMs the bar reaches ~95 %.
  // Formula: progress = 100 * (1 - 0.5^(t / halfLife))
  // Solving for 95 %:  halfLife = estimatedDuration / (log(20) / log(2)) ≈ est / 4.32
  const halfLifeMs = estimatedDurationMs / 4.32;

  // Ensure fresh state whenever the modal opens
  useEffect(() => {
    if (!open) return;
    reset();
    setFile(null);
    setIsDragOver(false);
    setProgress(0);
    startRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-generate on file selection/drop
  useEffect(() => {
    if (!file) return;
    if (isLoading) return;
    // Reset previous proof state so a new generation can start
    if (result) {
      reset();
      setProgress(0);
      startRef.current = null;
    }
    run(file, buildCommand(ensName ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Animated progress bar that approaches 100 % with the calibrated half-life
  useEffect(() => {
    let interval: number | undefined;
    if (isLoading && !result) {
      if (startRef.current == null) startRef.current = Date.now();
      interval = window.setInterval(() => {
        const elapsed = Date.now() - (startRef.current ?? Date.now());
        const pct = 100 * (1 - Math.pow(0.5, elapsed / halfLifeMs));
        setProgress(Math.min(99, pct));
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
  }, [isLoading, result, halfLifeMs]);

  const handleClose = () => {
    if (!hasSubmitted) {
      const ok = window.confirm(
        "Are you sure you want to close? Your progress will be lost.",
      );
      if (!ok) return;
    }
    reset();
    setFile(null);
    setIsDragOver(false);
    onClose();
  };

  // Notify parent and auto-close when submission succeeds
  useEffect(() => {
    if (hasSubmitted) {
      onSubmitted?.();
      setFile(null);
      setIsDragOver(false);
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSubmitted]);

  const isBusy = isLoading || isSubmitting;
  const currentStepLabel = stepLabel(step);
  const pctRounded = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <Modal
      open={open}
      onClose={handleClose}
      canClose={!isBusy}
      title={`Prove ${platformName} handle from email (.eml)`}
      footer={
        <>
          <button className="link-cta" onClick={handleClose}>
            Close
          </button>
          {!result ? (
            <button
              className="nav-cta"
              onClick={() => file && run(file, buildCommand(ensName ?? ""))}
              disabled={!file || isLoading}
            >
              {isLoading ? "Generating…" : "Generate proof"}
            </button>
          ) : (
            <button
              className="nav-cta"
              onClick={() => submit()}
              disabled={isSubmitting || hasSubmitted}
            >
              {hasSubmitted
                ? "Submitted"
                : isSubmitting
                  ? "Submitting…"
                  : "Submit onchain"}
            </button>
          )}
        </>
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        {(isBusy || (!!result && !hasSubmitted)) && !error && (
          <div style={{ display: "grid", gap: 6 }}>
            <div
              aria-hidden
              style={{
                height: 10,
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--card)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pctRounded}%`,
                  height: "100%",
                  background: isBusy ? "#60a5fa" : "#16a34a",
                  transition: "width 160ms ease",
                }}
              />
            </div>
            <div
              className="help-text"
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span>{currentStepLabel}</span>
              <span>{pctRounded}%</span>
            </div>
          </div>
        )}
        {!!result && !hasSubmitted && !isBusy && !error ? (
          <div className="help-text" role="status">
            Proof generated successfully. Submit onchain to complete
            verification.
          </div>
        ) : null}
        <ol className="help-text" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Request a password reset email from {platformName}.</li>
          <li>In your email client, download the email as .eml.</li>
          <li>Drop the .eml here or click to choose.</li>
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
            borderRadius: 8,
            padding: 16,
            textAlign: "center",
            background: isDragOver ? "#0b1020" : "transparent",
            cursor: "pointer",
          }}
        >
          <div className="help-text" style={{ marginBottom: 8 }}>
            {file
              ? `Selected: ${file.name}`
              : "Drag & drop .eml here or click to choose"}
          </div>
          <button
            type="button"
            className="link-cta"
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
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {error ? (
          <div className="help-text error" role="alert">
            {friendlyError(error)}
          </div>
        ) : null}
        {hasSubmitted ? (
          <div className="help-text" role="status">
            Transaction submitted. Once it's verified on-chain, your profile
            will automatically show Verified after confirmation. This may take
            a minute or two depending on network conditions.
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
