import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { NavBar } from "../components/NavBar";
import { ThemeToggle } from "../components/ThemeToggle";
import { RecordsList } from "../sections/RecordsList";
import { colorForName } from "../utils/color";
import {
  PENDING_OAUTH_PROOF_KEY,
  type PendingOAuthProof,
} from "./AuthCallbackPage";

export type { PendingOAuthProof };

export function ProfilePage() {
  const { ensName = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const { isConnected } = useAccount();
  const [editing, setEditing] = useState(false);
  const [pendingOAuthProof, setPendingOAuthProof] =
    useState<PendingOAuthProof | null>(null);
  const hasUnsaved = useRef(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_OAUTH_PROOF_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PendingOAuthProof;
      if (parsed?.platform && parsed?.result) {
        sessionStorage.removeItem(PENDING_OAUTH_PROOF_KEY);
        setPendingOAuthProof(parsed);
      }
    } catch {
      sessionStorage.removeItem(PENDING_OAUTH_PROOF_KEY);
    }
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return (
    <>
      <NavBar
        right={
          <>
            <ThemeToggle />
            {location.state?.from === "home" && (
              <button className="nav-cta" onClick={() => navigate(-1)}>
                Back
              </button>
            )}
          </>
        }
      />
      <main>
        <section className="container profile">
          <div className="profile-header">
            <div
              className="profile-avatar"
              style={{ background: colorForName(ensName) }}
            >
              {(ensName || "?").charAt(0).toUpperCase()}
            </div>
            <div className="profile-meta">
              <h1 className="profile-title">{ensName}</h1>
              <p className="profile-subtitle">ENS Profile</p>
            </div>
          </div>

          {!isConnected && (
            <p className="subtitle" style={{ textAlign: "center" }}>
              Connect your wallet to load resolver records.
            </p>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 16,
            }}
          >
            <h2 className="section-title" style={{ margin: 0 }}>
              Records
            </h2>
            {isConnected && (
              <button
                className="link-cta"
                onClick={() => {
                  if (editing && hasUnsaved.current) {
                    const ok = confirm(
                      "You have unsaved changes. Leave edit mode and discard them?"
                    );
                    if (!ok) return;
                  }
                  setEditing((e) => !e);
                }}
                aria-pressed={editing}
              >
                {editing ? "Done" : "Edit"}
              </button>
            )}
          </div>
          <RecordsList
            name={ensName}
            editing={editing}
            onDirtyStateChange={(dirty) => (hasUnsaved.current = dirty)}
            pendingOAuthProof={pendingOAuthProof}
            onConsumePendingOAuthProof={() => setPendingOAuthProof(null)}
          />
        </section>
      </main>
    </>
  );
}
