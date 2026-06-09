import {
  useAccount,
  useEnsText,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { namehash } from "viem/ens";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RecordKey } from "../../config/platforms";
import { normalizeValueForKey, validateValueForKey } from "./validators";
import { ensRegistryAbi, setTextAbi, textRecordVerifierAbi } from "./abi";
import { CONTRACTS } from "../../config/contracts";
import { VERIFY_COMMAND_ENDPOINT } from "../../config/env";
import { getPlatform, isPlatformVerifiable } from "../../config/platforms";

/**
 * Canonical ENS Registry address. Deployed deterministically at the same
 * address on mainnet, Sepolia, and most testnets where ENS is active.
 */
const ENS_REGISTRY_ADDRESS =
  "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as const;

export function useRecordText(name: string, key: RecordKey) {
  const { chainId } = useAccount();
  const { data, isLoading, refetch } = useEnsText({ name, key, chainId });

  const [draft, setDraft] = useState<string | undefined>(undefined);
  const value = draft ?? data ?? "";
  const originalValue = data ?? "";

  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId,
    confirmations: 1,
  });

  const queryClient = useQueryClient();
  const [justSaved, setJustSaved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const platform = getPlatform(key);
  const isVerifiable = key === "email" || isPlatformVerifiable(key);

  const verifierAddress = useMemo(() => {
    if (key === "email") return CONTRACTS.sepolia.linkEmailVerifier;
    if (platform) return platform.verifierAddress;
    return undefined;
  }, [key, platform]);

  const node = useMemo(() => namehash(name), [name]);

  // Resolve the resolver address by reading the ENS Registry directly.
  //
  // We deliberately do NOT use wagmi's `useEnsResolver` here: that hook
  // routes through the UniversalResolver, and on Sepolia (post-ENSv2
  // rollout, ~May 2026) the UniversalResolver returns a read-only fallback
  // resolver (`ENSV1Resolver`) for legacy v1 names. Writing `setText` to
  // that fallback reverts — the function doesn't exist.
  //
  // The Registry's resolver pointer remains the writable PublicResolver
  // for every legacy name (and is what new write-capable resolvers will
  // be registered against going forward), so it's the correct write target.
  const { data: resolver } = useReadContract({
    address: ENS_REGISTRY_ADDRESS,
    abi: ensRegistryAbi,
    functionName: "resolver",
    args: [node],
    chainId,
    query: { enabled: Boolean(name) },
  });

  const { data: verifiedData, isLoading: isVerifying } = useReadContract({
    address: verifierAddress,
    abi: textRecordVerifierAbi,
    functionName: "verifyTextRecord",
    args: [node, key, data ?? ""],
    chainId: sepolia.id,
    query: { enabled: isVerifiable && Boolean(data && data.length > 0) },
  });
  const isVerified = verifiedData === true;

  const disabled = !resolver || !chainId;

  const currentNormalized = normalizeValueForKey(key, value);
  const originalNormalized = normalizeValueForKey(key, data ?? "");
  const isUnchanged =
    draft === undefined || currentNormalized === originalNormalized;
  const isSaveDisabled =
    disabled || isUnchanged || !!validationError || isPending || isConfirming;

  const onChange = (next: string) => {
    setValidationError(null);
    setDraft(next);
  };

  const save = async () => {
    if (!resolver || draft === undefined) return;
    const normalized = normalizeValueForKey(key, draft);
    const error = validateValueForKey(key, normalized);
    setValidationError(error);
    if (error) return;
    const txHash = await writeContractAsync({
      address: resolver as `0x${string}`,
      abi: setTextAbi,
      functionName: "setText",
      args: [node, key, normalized],
      chainId,
    });
    setHash(txHash);
  };

  const resetDraft = () => {
    setDraft(undefined);
    setValidationError(null);
  };

  useEffect(() => {
    if (isSuccess) {
      setDraft(undefined);
      refetch();
      queryClient.invalidateQueries();
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), 1500);
      return () => clearTimeout(t);
    }
  }, [isSuccess, refetch, queryClient]);

  // Email verification request and polling
  const [verifyRequested, setVerifyRequested] = useState(false);
  const [verifyRequesting, setVerifyRequesting] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const { refetch: refetchVerification } = useReadContract({
    address: verifierAddress,
    abi: textRecordVerifierAbi,
    functionName: "verifyTextRecord",
    args: [node, key, data ?? ""],
    chainId: sepolia.id,
    query: { enabled: false },
  });

  useEffect(() => {
    if (!verifyRequested || isVerified) return;
    let stopped = false;
    const interval = setInterval(async () => {
      if (stopped) return;
      try {
        await refetchVerification();
      } catch {
        // ignore transient errors
      }
    }, 5000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [verifyRequested, isVerified, refetchVerification]);

  const requestVerification = async () => {
    if (!isVerifiable) return;
    const emailToVerify = originalValue;
    if (!emailToVerify) {
      setVerifyError("Enter an email first");
      return;
    }
    setVerifyError(null);
    setVerifyRequesting(true);
    try {
      const res = await fetch(VERIFY_COMMAND_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToVerify,
          command: `Link my email to ${name}`,
          verifier: CONTRACTS.sepolia.linkEmailVerifier,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }
      setVerifyRequested(true);
    } catch (err) {
      setVerifyError(
        err instanceof Error ? err.message : "Verification failed",
      );
    } finally {
      setVerifyRequesting(false);
    }
  };

  return {
    value,
    originalValue,
    isLoading,
    isVerifying,
    isVerified,
    isPending,
    isConfirming,
    isSaveDisabled,
    isUnchanged,
    disabled,
    justSaved,
    validationError,
    isVerifiable,
    verifyRequested,
    verifyRequesting,
    verifyError,
    requestVerification,
    onChange,
    save,
    resetDraft,
  } as const;
}
