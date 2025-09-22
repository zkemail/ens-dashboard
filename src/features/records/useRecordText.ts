import {
  useAccount,
  useEnsResolver,
  useEnsText,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { namehash } from "viem/ens";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RecordKey } from "./constants";
import { normalizeValueForKey, validateValueForKey } from "./validators";
import { setTextAbi, textVerifierAbi } from "./abi";
import { CONTRACTS } from "../../config/contracts";

export function useRecordText(name: string, key: RecordKey) {
  const { chainId } = useAccount();
  const { data: resolver } = useEnsResolver({ name, chainId });
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

  const isEmail = key === "email";
  const node = useMemo(() => namehash(name), [name]);
  const { data: verifiedData, isLoading: isVerifying } = useReadContract({
    address: CONTRACTS.sepolia.textVerifier,
    abi: textVerifierAbi,
    functionName: "verifyTextRecord",
    args: [node, "email", data ?? ""],
    chainId: sepolia.id,
    query: { enabled: isEmail && Boolean(data && data.length > 0) },
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
    isEmail,
    onChange,
    save,
    resetDraft,
  } as const;
}
