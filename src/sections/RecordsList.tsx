import {
  useEnsText,
  useEnsResolver,
  useWriteContract,
  useAccount,
  useWaitForTransactionReceipt,
} from "wagmi";
import { namehash } from "viem/ens";
import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
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
] as const;
type RecordKey = (typeof COMMON_KEYS)[number];

export function RecordsList({
  name,
  editing = false,
  onDirtyStateChange,
}: {
  name: string;
  editing?: boolean;
  onDirtyStateChange?: (hasChanges: boolean) => void;
}) {
  const itemHandles = useRef<Record<RecordKey, RecordItemHandle | null>>(
    {} as Record<RecordKey, RecordItemHandle | null>
  );

  const [dirtyKeys, setDirtyKeys] = useState<Set<RecordKey>>(new Set());
  const [savingAll, setSavingAll] = useState(false);

  // Notify parent about dirty state
  useEffect(() => {
    onDirtyStateChange?.(dirtyKeys.size > 0);
  }, [dirtyKeys, onDirtyStateChange]);

  const onDirtyChange = (key: RecordKey, isDirty: boolean) => {
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      if (isDirty) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const hasChanges = dirtyKeys.size > 0;

  const onSaveAll = async () => {
    if (!hasChanges || savingAll) return;
    setSavingAll(true);
    try {
      const tasks = COMMON_KEYS.map((k) =>
        itemHandles.current[k]?.saveIfDirty()
      );
      const results = await Promise.all(tasks);
      // filter out undefined and unsuccessful saves
      const anySaved = (results || []).some((r) => r === true);
      if (anySaved) {
        setDirtyKeys(new Set());
      }
    } finally {
      setSavingAll(false);
    }
  };

  const onRevertAll = () => {
    COMMON_KEYS.forEach((k) => itemHandles.current[k]?.resetDraft());
    setDirtyKeys(new Set());
  };

  return (
    <>
      {editing && (
        <div className="list-toolbar">
          <button
            className="link-cta"
            onClick={onRevertAll}
            disabled={!hasChanges || savingAll}
            aria-disabled={!hasChanges || savingAll}
            title={
              hasChanges ? "Revert all unsaved changes" : "No changes to revert"
            }
          >
            Revert all
          </button>
          <button
            className="link-cta"
            onClick={onSaveAll}
            disabled={!hasChanges || savingAll}
            aria-disabled={!hasChanges || savingAll}
            title={
              hasChanges ? "Save all modified records" : "No changes to save"
            }
          >
            {savingAll ? "Saving…" : "Save all"}
          </button>
        </div>
      )}
      <ul className="list" style={{ marginTop: 16 }}>
        {COMMON_KEYS.map((key) => (
          <RecordItem
            key={key}
            ref={(inst) => {
              itemHandles.current[key] = inst;
            }}
            name={name}
            textKey={key}
            editing={editing}
            onDirtyChange={onDirtyChange}
          />
        ))}
      </ul>
    </>
  );
}

type RecordItemHandle = {
  saveIfDirty: () => Promise<boolean>;
  resetDraft: () => void;
  hasChanges: () => boolean;
};

type RecordItemProps = {
  name: string;
  textKey: RecordKey;
  editing: boolean;
  onDirtyChange: (key: RecordKey, isDirty: boolean) => void;
};

const RecordItem = forwardRef<RecordItemHandle, RecordItemProps>(
  function RecordItem({ name, textKey, editing, onDirtyChange }, ref) {
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
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt(
      {
        hash,
        chainId,
        confirmations: 1,
      }
    );
    const queryClient = useQueryClient();
    const [justSaved, setJustSaved] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const value = draft ?? data ?? "";
    const disabled = !resolver || !chainId;

    const onSave = async () => {
      if (!resolver || draft === undefined) return;
      const normalized = normalizeValueForKey(textKey, draft);
      const error = validateValueForKey(textKey, normalized);
      setValidationError(error);
      if (error) return;
      const node = namehash(name);
      const txHash = await writeContractAsync({
        address: resolver as `0x${string}`,
        abi: setTextAbi,
        functionName: "setText",
        args: [node, textKey, normalized],
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

    // when leaving edit mode, discard local draft and errors
    useEffect(() => {
      if (!editing) {
        setDraft(undefined);
        setValidationError(null);
      }
    }, [editing]);

    const label = labelForKey(textKey);
    const currentNormalized = normalizeValueForKey(textKey, value);
    const originalNormalized = normalizeValueForKey(textKey, data ?? "");
    const isUnchanged =
      draft === undefined || currentNormalized === originalNormalized;
    const isSaveDisabled =
      disabled || isUnchanged || !!validationError || isPending || isConfirming;

    useEffect(() => {
      onDirtyChange(textKey, !isUnchanged);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isUnchanged]);

    useImperativeHandle(ref, () => ({
      async saveIfDirty() {
        if (isUnchanged) return false;
        await onSave();
        return true;
      },
      resetDraft() {
        setDraft(undefined);
        setValidationError(null);
      },
      hasChanges() {
        return !isUnchanged;
      },
    }));

    // Hide empty values when not editing (use on-chain data, not draft)
    const viewValue = data ?? "";
    if (!editing && !viewValue) return null;

    return (
      <li className="name-card">
        <div className="record-grid">
          <div className="record-label">{label}</div>

          {editing ? (
            <div className="record-input-row">
              {textKey === "description" ? (
                <textarea
                  value={value}
                  onChange={(e) => {
                    setValidationError(null);
                    setDraft(e.target.value);
                  }}
                  placeholder={
                    isLoading ? "Loading…" : placeholderForKey(textKey)
                  }
                  className="textarea"
                  rows={3}
                  disabled={isLoading}
                />
              ) : (
                <input
                  value={value}
                  onChange={(e) => {
                    setValidationError(null);
                    setDraft(e.target.value);
                  }}
                  placeholder={
                    isLoading ? "Loading…" : placeholderForKey(textKey)
                  }
                  className="input"
                  disabled={isLoading}
                />
              )}
              {!isUnchanged && !validationError ? (
                <span className="dot" title="Unsaved changes" />
              ) : null}
              {!isUnchanged ? (
                <button
                  className="link-cta"
                  onClick={onSave}
                  disabled={isSaveDisabled}
                >
                  {isPending || isConfirming
                    ? "Saving…"
                    : justSaved
                    ? "Saved"
                    : "Save"}
                </button>
              ) : null}
              {validationError ? (
                <div className="help-text error" role="alert">
                  {validationError}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="record-value">
              {renderValue(textKey, viewValue)}
            </div>
          )}
        </div>
      </li>
    );
  }
);

function labelForKey(key: RecordKey): string {
  switch (key) {
    case "com.twitter":
      return "Twitter";
    case "com.github":
      return "GitHub";
    case "org.telegram":
      return "Telegram";
    default:
      return key;
  }
}

function placeholderForKey(key: RecordKey): string {
  switch (key) {
    case "email":
      return "name@example.com";
    case "url":
      return "https://example.com";
    case "com.twitter":
      return "username";
    case "com.github":
      return "username";
    case "org.telegram":
      return "username";
    case "avatar":
      return "https://.../avatar.png";
    case "description":
      return "Tell the world about you";
    default:
      return "Not set";
  }
}

function renderValue(key: RecordKey, value: string) {
  const textStyle: React.CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
  if (!value) return null;
  switch (key) {
    case "email": {
      const href = `mailto:${value}`;
      return (
        <a href={href} className="pill-link" target="_blank" rel="noreferrer">
          {value}
        </a>
      );
    }
    case "url": {
      const href = value.startsWith("http") ? value : `https://${value}`;
      return (
        <a href={href} className="pill-link" target="_blank" rel="noreferrer">
          {value}
        </a>
      );
    }
    case "com.twitter": {
      const handle = value.replace(/^@/, "");
      const href = `https://x.com/${handle}`;
      return (
        <a href={href} className="pill-link" target="_blank" rel="noreferrer">
          @{handle}
        </a>
      );
    }
    case "com.github": {
      const handle = value.replace(/^@/, "");
      const href = `https://github.com/${handle}`;
      return (
        <a href={href} className="pill-link" target="_blank" rel="noreferrer">
          {handle}
        </a>
      );
    }
    case "org.telegram": {
      const handle = value.replace(/^@/, "");
      const href = `https://t.me/${handle}`;
      return (
        <a href={href} className="pill-link" target="_blank" rel="noreferrer">
          @{handle}
        </a>
      );
    }
    case "avatar": {
      const href = value.startsWith("http") ? value : undefined;
      if (!href) return <span style={textStyle}>{value}</span>;
      return (
        <img
          src={href}
          alt="Avatar"
          style={{
            width: 56,
            height: 56,
            borderRadius: 8,
            objectFit: "cover",
            border: "1px solid var(--border)",
          }}
          loading="lazy"
        />
      );
    }
    case "description":
      return (
        <p className="clamp-3" style={{ margin: 0 }}>
          {value}
        </p>
      );
    default:
      return <span style={textStyle}>{value}</span>;
  }
}

function normalizeValueForKey(key: RecordKey, raw: string): string {
  const value = (raw || "").trim();
  switch (key) {
    case "email":
      return value.toLowerCase();
    case "url": {
      if (!value) return value;
      const hasProtocol = /^https?:\/\//i.test(value);
      return hasProtocol ? value : `https://${value}`;
    }
    case "com.twitter":
    case "com.github":
    case "org.telegram": {
      const handle = value.replace(/^@+/, "").trim();
      return handle;
    }
    default:
      return value;
  }
}

function validateValueForKey(key: RecordKey, value: string): string | null {
  if (!value) return null; // allow clearing
  switch (key) {
    case "email": {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      return ok ? null : "Enter a valid email";
    }
    case "url": {
      try {
        new URL(value);
        return null;
      } catch {
        return "Enter a valid URL";
      }
    }
    case "com.twitter":
    case "com.github":
    case "org.telegram": {
      const ok = /^[A-Za-z0-9_.]{1,30}$/.test(value);
      return ok ? null : "Use letters, numbers, '_' or '.'";
    }
    default:
      return null;
  }
}
