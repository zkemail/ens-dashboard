import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { ConnectKitButton, useModal } from "connectkit";
import { NavBar } from "../components/NavBar";
import { ThemeToggle } from "../components/ThemeToggle";
import { ProofModal } from "../components/ProofModal";
import { useProof } from "../features/proving/useProof";
import { getPlatform } from "../config/platforms";
import { resolvePlatformKey } from "../utils/prefillParams";
import {
  PENDING_OAUTH_PROOF_KEY,
  type PendingOAuthProof,
} from "./AuthCallbackPage";
import "./VerifyPage.css";

type Step = "connect" | "confirm" | "verify" | "done";

const STEP_ORDER: Step[] = ["connect", "confirm", "verify"];
const STEP_LABELS: Record<Step, string> = {
  connect: "Connect",
  confirm: "Confirm",
  verify: "Verify",
  done: "Done",
};

function StepIndicator({ current }: { current: Step }) {
  const activeIndex =
    current === "done" ? STEP_ORDER.length : STEP_ORDER.indexOf(current);
  return (
    <div className="verify-steps" role="list" aria-label="Verification steps">
      {STEP_ORDER.map((step, i) => {
        const state =
          i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
        return (
          <div
            key={step}
            className="verify-step-pip"
            data-state={state}
            role="listitem"
          >
            <div className="verify-step-dot" aria-hidden>
              {state === "done" ? "✓" : i + 1}
            </div>
            <span className="verify-step-label">{STEP_LABELS[step]}</span>
          </div>
        );
      })}
    </div>
  );
}

function MissingParamsCard() {
  return (
    <section className="container verify-flow">
      <div className="verify-card">
        <h2 className="verify-card-title">Missing verification details</h2>
        <p className="verify-card-body muted">
          This page expects URL parameters from a Discord bot or similar tool
          (e.g.{" "}
          <code>?ens=vitalik.eth&amp;platform=discord&amp;handle=vitalik</code>).
          If you got here directly, head back to the homepage and pick an ENS
          name from there.
        </p>
        <div className="verify-actions">
          <a className="nav-cta" href="/">
            Back to home
          </a>
        </div>
      </div>
    </section>
  );
}

function ShortAddress({ value }: { value: string }) {
  if (value.length <= 10) return <>{value}</>;
  return (
    <>
      {value.slice(0, 6)}…{value.slice(-4)}
    </>
  );
}

export function VerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isConnected, address } = useAccount();
  const { setOpen: setConnectModalOpen } = useModal();

  const ensName = searchParams.get("ens")?.trim().toLowerCase() || "";
  const handle = searchParams.get("handle")?.trim() || "";
  const platformKey = resolvePlatformKey(searchParams.get("platform"));
  const platform = useMemo(
    () => (platformKey ? getPlatform(platformKey) : undefined),
    [platformKey],
  );

  const proofHook = useProof(
    platform ?? {
      key: "noop",
      label: "",
      placeholder: "",
      verifiable: false,
    },
  );

  const [step, setStep] = useState<Step>(isConnected ? "confirm" : "connect");
  const [proofModalOpen, setProofModalOpen] = useState(false);

  // Auto-advance from connect step once the wallet is connected.
  useEffect(() => {
    setStep((current) => {
      if (current === "connect" && isConnected) return "confirm";
      return current;
    });
  }, [isConnected]);

  // Move to the done step once the on-chain submission is confirmed.
  useEffect(() => {
    if (proofHook.hasSubmitted) {
      setStep("done");
      setProofModalOpen(false);
    }
  }, [proofHook.hasSubmitted]);

  // Auto-pop the connect modal once on mount when not connected — saves a tap.
  const promptedConnectRef = useRef(false);
  useEffect(() => {
    if (!platform || isConnected || promptedConnectRef.current) return;
    promptedConnectRef.current = true;
    setConnectModalOpen(true);
  }, [platform, isConnected, setConnectModalOpen]);

  // Pick up a pending OAuth proof when returning from Google sign-in. Same
  // pattern as ProfilePage. We jump straight to the proof modal so the user
  // can review and submit on-chain without re-uploading anything.
  const consumedOAuthRef = useRef(false);
  useEffect(() => {
    if (consumedOAuthRef.current) return;
    if (!platform) return;
    const raw = sessionStorage.getItem(PENDING_OAUTH_PROOF_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PendingOAuthProof;
      if (parsed?.platform !== platform.key) return;
      sessionStorage.removeItem(PENDING_OAUTH_PROOF_KEY);
      consumedOAuthRef.current = true;
      const r = parsed.result as Record<string, unknown> | null;
      const proofProps =
        r && typeof r === "object"
          ? ((r.proof as Record<string, unknown> | undefined)?.props as
              | Record<string, unknown>
              | undefined)
          : undefined;
      if (!proofProps?.proofData || !Array.isArray(proofProps?.publicOutputs)) {
        return;
      }
      proofHook.setResult?.(
        parsed.result as { proof: unknown; verification: unknown },
      );
      setStep("verify");
      setProofModalOpen(true);
    } catch {
      sessionStorage.removeItem(PENDING_OAUTH_PROOF_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  if (!ensName || !platform || !handle || !platform.verifiable) {
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
          <MissingParamsCard />
        </main>
      </>
    );
  }

  const oauthReturnPath = `/verify?${searchParams.toString()}`;

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
        <section className="container verify-flow">
          <header className="verify-context">
            <span className="verify-context-eyebrow">
              Verify {platform.label} handle
            </span>
            <h1 className="verify-context-title">
              <strong>{handle}</strong> on <strong>{ensName}</strong>
            </h1>
          </header>

          <StepIndicator current={step} />

          {step === "connect" && (
            <div className="verify-card">
              <h2 className="verify-card-title">Connect your wallet</h2>
              <p className="verify-card-body">
                Connect the wallet that owns{" "}
                <strong>{ensName}</strong>. You'll use it to sign the on-chain
                transaction that records this verification.
              </p>
              <div className="verify-actions">
                <ConnectKitButton />
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="verify-card">
              <h2 className="verify-card-title">Confirm details</h2>
              <dl className="verify-details">
                <dt>ENS name</dt>
                <dd>{ensName}</dd>
                <dt>Platform</dt>
                <dd>{platform.label}</dd>
                <dt>Handle</dt>
                <dd>{handle}</dd>
                <dt>Wallet</dt>
                <dd>
                  {address ? <ShortAddress value={address} /> : "—"}
                </dd>
              </dl>
              <p className="verify-card-body muted">
                Make sure the connected wallet owns <strong>{ensName}</strong>.
                If not, switch wallets via the connect button above.
              </p>
              <div className="verify-actions">
                <button
                  type="button"
                  className="link-cta"
                  onClick={() => setStep("connect")}
                >
                  Change wallet
                </button>
                <button
                  type="button"
                  className="nav-cta"
                  onClick={() => {
                    setStep("verify");
                    setProofModalOpen(true);
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === "verify" && (
            <div className="verify-card">
              <h2 className="verify-card-title">
                Prove ownership of {handle}
              </h2>
              <p className="verify-card-body">
                We need a ZK proof that you control the {platform.label} account{" "}
                <strong>{handle}</strong>. The simplest path is to sign in with
                Google so we can find the {platform.label} password-reset email
                automatically — or you can upload a <code>.eml</code> file
                manually.
              </p>
              <div className="verify-actions">
                <button
                  type="button"
                  className="link-cta"
                  onClick={() => setStep("confirm")}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="nav-cta"
                  onClick={() => setProofModalOpen(true)}
                >
                  {proofHook.result ? "Continue verification" : "Start verification"}
                </button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="verify-card">
              <div className="verify-success">
                <div className="verify-success-icon" aria-hidden>
                  ✓
                </div>
                <h2 className="verify-card-title">Verified!</h2>
                <p className="verify-card-body">
                  <strong>{handle}</strong> is now linked to{" "}
                  <strong>{ensName}</strong> with a ZK proof.
                </p>
                <p className="verify-card-body muted">
                  Head back to Discord and run{" "}
                  <code>/verify {ensName}</code> again to claim your role.
                </p>
              </div>
              <div className="verify-actions">
                <button
                  type="button"
                  className="link-cta"
                  onClick={() => navigate(`/name/${ensName}`)}
                >
                  View profile
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <ProofModal
        open={proofModalOpen}
        onClose={() => setProofModalOpen(false)}
        ensName={ensName}
        platformName={platform.label}
        estimatedDurationMs={platform.estimatedProveDurationMs ?? 60_000}
        buildCommand={platform.buildCommand ?? (() => "")}
        hook={proofHook}
        platformKey={platform.key}
        blueprintSlug={platform.blueprintSlug}
        gmailQuery={platform.gmailQuery}
        oauthReturnPath={oauthReturnPath}
      />
    </>
  );
}
