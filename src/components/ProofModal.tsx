import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { BACKEND_URL } from "../config/env";
import {
  OAUTH_PLATFORM_KEY,
  OAUTH_RETURN_PATH_KEY,
} from "../pages/AuthCallbackPage";

/** Google "G" logo for the sign-in button (official colors). */
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

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
  setResult?: (result: { proof: unknown; verification: unknown } | null) => void;
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

  /** Platform key (e.g. com.twitter) for OAuth context; required for Google sign-in option */
  platformKey?: string;
  /** Blueprint slug for backend (e.g. benceharomi/X_HANDLE@v2); required for Google sign-in */
  blueprintSlug?: string;
  /** Gmail search query for OAuth (e.g. from:info@x.com subject:"Password reset request") */
  gmailQuery?: string;
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

const canUseGoogleSignIn = (p: ProofModalProps) =>
  Boolean(p.platformKey && p.blueprintSlug && p.gmailQuery);

export function ProofModal({
  open,
  onClose,
  ensName,
  onSubmitted,
  platformName,
  estimatedDurationMs,
  buildCommand,
  hook,
  platformKey,
  blueprintSlug,
  gmailQuery,
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

  const [useGoogleAuth, setUseGoogleAuth] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const showGoogleOption = canUseGoogleSignIn({
    platformKey,
    blueprintSlug,
    gmailQuery,
  } as ProofModalProps);
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
    setUseGoogleAuth(false);
    setIsDragOver(false);
    setProgress(0);
    startRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-generate on file selection/drop (only when using .eml upload)
  useEffect(() => {
    if (!file || useGoogleAuth) return;
    if (isLoading) return;
    // Reset previous proof state so a new generation can start
    if (result) {
      reset();
      setProgress(0);
      startRef.current = null;
    }
    run(file, buildCommand(ensName ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, useGoogleAuth]);

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
            !useGoogleAuth && (
              <button
                className="nav-cta"
                onClick={() => file && run(file, buildCommand(ensName ?? ""))}
                disabled={!file || isLoading}
              >
                {isLoading ? "Generating…" : "Generate proof"}
              </button>
            )
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
          <li>In your email client, download the email as .eml or sign in with Google.</li>
          <li>Drop the .eml here or choose Sign in with Google below.</li>
        </ol>
        {showGoogleOption ? (
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setUseGoogleAuth(true)}
              style={{
                flex: 1,
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: useGoogleAuth ? "var(--background)" : "transparent",
                color: "var(--text)",
                fontWeight: useGoogleAuth ? 500 : 400,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Sign in with Google
            </button>
            <button
              type="button"
              onClick={() => setUseGoogleAuth(false)}
              style={{
                flex: 1,
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: !useGoogleAuth ? "var(--background)" : "transparent",
                color: "var(--text)",
                fontWeight: !useGoogleAuth ? 500 : 400,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Upload .eml file
            </button>
          </div>
        ) : null}
        {useGoogleAuth && showGoogleOption ? (
          <div style={{ display: "grid", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                const command = buildCommand(ensName ?? "");
                sessionStorage.setItem(OAUTH_PLATFORM_KEY, platformKey!);
                sessionStorage.setItem(
                  OAUTH_RETURN_PATH_KEY,
                  `/name/${encodeURIComponent(ensName ?? "")}`,
                );
                const callbackUrl = `${window.location.origin}/auth/callback`;
                const params = new URLSearchParams({
                  query: gmailQuery!,
                  blueprint: blueprintSlug!,
                  command,
                  redirect_uri: callbackUrl,
                  return_to: callbackUrl, // Some backends use return_to instead
                });
                window.location.href = `${BACKEND_URL}/gmail/auth?${params.toString()}`;
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                color: "#3c4043",
                background: "#fff",
                border: "1px solid #dadce0",
                borderRadius: 4,
                cursor: "pointer",
                boxShadow: "0 1px 2px 0 rgba(60, 64, 67, 0.3)",
                minHeight: 40,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#f8f9fa";
                e.currentTarget.style.boxShadow =
                  "0 1px 3px 0 rgba(60, 64, 67, 0.3), 0 4px 8px 3px rgba(60, 64, 67, 0.15)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.boxShadow = "0 1px 2px 0 rgba(60, 64, 67, 0.3)";
              }}
            >
              <GoogleLogo size={20} />
              Sign in with Google
            </button>
          </div>
        ) : (
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
        )}
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
