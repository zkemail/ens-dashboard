import {
  useParams,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectKitButton, useModal } from "connectkit";
import { NavBar } from "../components/NavBar";
import { ThemeToggle } from "../components/ThemeToggle";
import { RecordsList, type InitialPrefill } from "../sections/RecordsList";
import { colorForName } from "../utils/color";
import { resolvePlatformKey } from "../utils/prefillParams";
import {
  PENDING_OAUTH_PROOF_KEY,
  type PendingOAuthProof,
} from "./AuthCallbackPage";

export type { PendingOAuthProof };

export function ProfilePage() {
  const { ensName = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [searchParams] = useSearchParams();
  const { isConnected } = useAccount();
  const { setOpen: setConnectModalOpen } = useModal();
  const initialPrefill = useMemo<InitialPrefill | undefined>(() => {
    const platformKey = resolvePlatformKey(searchParams.get("platform"));
    const handle = searchParams.get("handle");
    if (!platformKey || !handle) return undefined;
    return { platformKey, handle };
  }, [searchParams]);
  const [editing, setEditing] = useState(Boolean(initialPrefill));

  // Deep-link arrivals (with a prefilled record from an external tool like
  // the Discord verification bot) need a wallet to save records. Auto-open
  // the ConnectKit modal once so they're not dead-ended on a page with no
  // visible connect entry point.
  const promptedConnectRef = useRef(false);
  useEffect(() => {
    if (!initialPrefill || isConnected || promptedConnectRef.current) return;
    promptedConnectRef.current = true;
    setConnectModalOpen(true);
  }, [initialPrefill, isConnected, setConnectModalOpen]);
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
            <ConnectKitButton />
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
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                marginTop: 12,
              }}
            >
              <p className="subtitle" style={{ textAlign: "center", margin: 0 }}>
                Connect your wallet to load resolver records.
              </p>
              <ConnectKitButton />
            </div>
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
                      "You have unsaved changes. Leave edit mode and discard them?",
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
            initialPrefill={initialPrefill}
          />
        </section>
      </main>
    </>
  );
}
