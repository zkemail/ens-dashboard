import { useState } from "react";
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
  const { isLoading, error, json, run } = useTwitterProof();

  const disabled = !file || isLoading;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Prove Twitter handle from email (.eml)"
      footer={
        <>
          <button className="link-cta" onClick={onClose}>
            Close
          </button>
          <button
            className="nav-cta"
            onClick={() =>
              file && run(file, `Link my x handle to ${ensName ?? ""}`)
            }
            disabled={disabled}
          >
            {isLoading ? "Generating…" : "Generate proof"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        <p className="help-text" style={{ margin: 0 }}>
          1) Request a password reset email from X/Twitter. 2) Download the
          email as .eml. 3) Upload it here. We’ll generate a ZK proof locally.
        </p>
        <label className="help-text" htmlFor="tw-eml">
          Email file (.eml)
        </label>
        <input
          id="tw-eml"
          type="file"
          accept=".eml"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {error ? (
          <div className="help-text error" role="alert">
            {error}
          </div>
        ) : null}
        {json ? (
          <pre
            style={{
              maxHeight: 260,
              overflow: "auto",
              background: "#0b1020",
              color: "#e5e7eb",
              padding: 12,
              borderRadius: 8,
              border: "1px solid var(--border)",
            }}
          >
            {json}
          </pre>
        ) : null}
      </div>
    </Modal>
  );
}
