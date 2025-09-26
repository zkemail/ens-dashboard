import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { useTwitterProof } from "../features/twitter/useTwitterProof";

export function TwitterProofModal({
  open,
  onClose,
  ensName,
}: {
  open: boolean;
  onClose: () => void;
  ensName?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const {
    isLoading,
    isSubmitting,
    hasSubmitted,
    error,
    result,
    run,
    submit,
    reset,
  } = useTwitterProof();

  // Ensure fresh state whenever the modal opens
  useEffect(() => {
    if (!open) return;
    reset();
    setFile(null);
    setIsDragOver(false);
    setProgress(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-generate on file selection/drop
  useEffect(() => {
    if (!file) return;
    if (isLoading || result) return;
    run(file, `Link my x handle to ${ensName ?? ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

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
        // Cap at 99% while generating so we never show complete prematurely
        setProgress(Math.min(99, progressToHundred));
      }, 120);
    } else if (!isLoading && result) {
      setProgress(100);
      startRef.current = null;
    } else if (!isLoading && !result) {
      // reset when idle and no result
      setProgress(0);
      startRef.current = null;
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isLoading, result]);

  const handleClose = () => {
    // Allow closing without confirmation once submitted
    if (!hasSubmitted) {
      const ok = window.confirm(
        "Are you sure you want to close? Your progress will be lost."
      );
      if (!ok) return;
    }
    reset();
    setFile(null);
    setIsDragOver(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      canClose={!isLoading}
      title="Prove X handle from email (.eml)"
      footer={
        <>
          <button className="link-cta" onClick={handleClose}>
            Close
          </button>
          {!result ? (
            <button
              className="nav-cta"
              onClick={() =>
                file && run(file, `Link my x handle to ${ensName ?? ""}`)
              }
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
        {(isLoading || (result && !hasSubmitted)) && (
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
                  width: `${Math.min(100, Math.max(0, Math.round(progress)))}%`,
                  height: "100%",
                  background: isLoading ? "#60a5fa" : "#16a34a",
                  transition: "width 160ms ease",
                }}
              />
            </div>
            <span className="help-text" style={{ justifySelf: "end" }}>
              {Math.min(100, Math.max(0, Math.round(progress)))}%
            </span>
          </div>
        )}
        <ol className="help-text" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Request a password reset email from X.</li>
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
            id="tw-eml"
            type="file"
            accept=".eml"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {error ? (
          <div className="help-text error" role="alert">
            {error}
          </div>
        ) : null}
        {result && !hasSubmitted ? (
          <div className="help-text" role="status">
            Proof generated successfully. Submit onchain to complete
            verification.
          </div>
        ) : null}
        {hasSubmitted ? (
          <div className="help-text" role="status">
            Submitted. You can close this dialog.
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
