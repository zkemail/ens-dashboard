import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { concatHex, type Hex } from "viem";
import { BACKEND_URL } from "../config/env";

/** SessionStorage key for OAuth return path (e.g. /name/foo.eth). */
export const OAUTH_RETURN_PATH_KEY = "oauth_return_path";
/** SessionStorage key for platform key (e.g. com.twitter). */
export const OAUTH_PLATFORM_KEY = "oauth_platform";
/** SessionStorage key for pending proof after callback: { platform, result }. */
export const PENDING_OAUTH_PROOF_KEY = "pending_oauth_proof";

/** Shape of the pending proof stored after OAuth callback (platform + result for proof hook). */
export interface PendingOAuthProof {
  platform: string;
  result: unknown;
}

interface BackendProofResponse {
  success: boolean;
  proof?: Hex[];
  publicInputs?: Hex[];
  email?: { raw: string };
  handle?: string;
  error?: string;
}

function transformBackendProof(proof: Hex[], publicInputs: Hex[]) {
  const proofData = concatHex(proof);
  return {
    proof: {
      props: {
        proofData,
        publicOutputs: publicInputs,
      },
    },
    verification: { verified: true },
  };
}

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const proofId = searchParams.get("proofId");
    const errorParam = searchParams.get("error");

    const scheduleRedirect = (returnPath: string) => {
      redirectTimeoutRef.current = setTimeout(
        () => navigate(returnPath, { replace: true }),
        3000,
      );
    };

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      setStatus("error");
      const returnPath =
        sessionStorage.getItem(OAUTH_RETURN_PATH_KEY) || "/";
      sessionStorage.removeItem(OAUTH_RETURN_PATH_KEY);
      sessionStorage.removeItem(OAUTH_PLATFORM_KEY);
      scheduleRedirect(returnPath);
      return () => {
        if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
      };
    }

    if (!proofId) {
      setError("No proof ID received from authentication");
      setStatus("error");
      const returnPath =
        sessionStorage.getItem(OAUTH_RETURN_PATH_KEY) || "/";
      sessionStorage.removeItem(OAUTH_RETURN_PATH_KEY);
      sessionStorage.removeItem(OAUTH_PLATFORM_KEY);
      scheduleRedirect(returnPath);
      return () => {
        if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
      };
    }

    const platform = sessionStorage.getItem(OAUTH_PLATFORM_KEY);
    const returnPath = sessionStorage.getItem(OAUTH_RETURN_PATH_KEY) || "/";

    if (!platform) {
      setError("Missing platform context");
      setStatus("error");
      scheduleRedirect(returnPath);
      return () => {
        if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
      };
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/proof/${proofId}`);
        if (cancelled) return;
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || `Failed to fetch proof (${response.status})`);
        }
        const data: BackendProofResponse = await response.json();
        if (cancelled) return;
        if (!data.success || !data.proof || !data.publicInputs) {
          throw new Error(data.error || "Invalid proof response");
        }
        const result = transformBackendProof(data.proof, data.publicInputs);
        sessionStorage.setItem(
          PENDING_OAUTH_PROOF_KEY,
          JSON.stringify({ platform, result }),
        );
        sessionStorage.removeItem(OAUTH_RETURN_PATH_KEY);
        sessionStorage.removeItem(OAUTH_PLATFORM_KEY);
        setStatus("success");
        navigate(returnPath, { replace: true });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to fetch proof");
        setStatus("error");
        sessionStorage.removeItem(OAUTH_RETURN_PATH_KEY);
        sessionStorage.removeItem(OAUTH_PLATFORM_KEY);
        scheduleRedirect(returnPath);
      }
    })();
    return () => {
      cancelled = true;
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    };
  }, [searchParams, navigate]);

  if (status === "error") {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p className="help-text error" role="alert">
          Authentication failed: {error}
        </p>
        <p className="help-text">Redirecting back…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <p className="help-text">
        {status === "loading"
          ? "Processing your email…"
          : "Authentication successful. Redirecting…"}
      </p>
    </div>
  );
}
