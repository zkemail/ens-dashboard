import {
  useEnsText,
  useEnsResolver,
  useWriteContract,
  useAccount,
  useWaitForTransactionReceipt,
} from "wagmi";
import { namehash } from "viem/ens";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
// Type package paths can vary; import from runtime ESM and cast type locally
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - using runtime ESM export without types
type AbiInput = { readonly name?: string; readonly type: string };
type AbiOutput = { readonly name?: string; readonly type: string };
type AbiItem = {
  readonly name: string;
  readonly type: string;
  readonly stateMutability?: string;
  readonly inputs?: readonly AbiInput[];
  readonly outputs?: readonly AbiOutput[];
};
type Abi = readonly [AbiItem];

const setTextAbi: Abi = [
  {
    name: "setText",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    outputs: [] as unknown as AbiOutput[],
  },
];

const COMMON_KEYS = [
  "email",
  "url",
  "avatar",
  "com.twitter",
  "com.github",
  "org.telegram",
  "description",
];

export function RecordsList({ name }: { name: string }) {
  return (
    <ul className="list" style={{ marginTop: 16 }}>
      {COMMON_KEYS.map((key) => (
        <RecordItem key={key} name={name} textKey={key} />
      ))}
    </ul>
  );
}

function RecordItem({ name, textKey }: { name: string; textKey: string }) {
  const { chainId } = useAccount();
  const { data: resolver } = useEnsResolver({ name, chainId });
  const { data, isLoading, refetch } = useEnsText({
    name,
    key: textKey,
    chainId,
  });
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId,
    confirmations: 1,
  });
  const queryClient = useQueryClient();
  const [justSaved, setJustSaved] = useState(false);

  const value = draft ?? data ?? "";
  const disabled = !resolver || !chainId;

  const onSave = async () => {
    if (!resolver || draft === undefined) return;
    const node = namehash(name);
    const txHash = await writeContractAsync({
      address: resolver as `0x${string}`,
      abi: setTextAbi,
      functionName: "setText",
      args: [node, textKey, draft],
      chainId,
    });
    setHash(txHash);
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

  return (
    <li className="name-card">
      <div className="name-left">
        <span className="avatar" style={{ background: "#64748b" }} />
        <span className="name-text">{textKey}</span>
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
      >
        <input
          value={value}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={isLoading ? "Loading…" : "Not set"}
          className="input"
          disabled={isLoading}
        />
        <button
          className="nav-cta"
          onClick={onSave}
          disabled={
            disabled || draft === undefined || isPending || isConfirming
          }
        >
          {isPending || isConfirming ? "Saving…" : justSaved ? "Saved" : "Save"}
        </button>
      </div>
    </li>
  );
}
