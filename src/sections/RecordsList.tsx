// UI-only module; wagmi hooks are encapsulated in useRecordText
import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
//
import { COMMON_KEYS, type RecordKey } from "../features/records/constants";
import { labelForKey } from "../features/records/validators";
import { useRecordText } from "../features/records/useRecordText";
import { Modal } from "../components/Modal";
import { TwitterProofModal } from "../components/TwitterProofModal";

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
      const tasks = COMMON_KEYS.map((k) => {
        const inst = itemHandles.current[k];
        if (!inst) return Promise.resolve(false);
        if (inst.isSaving()) return Promise.resolve(false);
        if (!inst.hasChanges()) return Promise.resolve(false);
        return inst.saveIfDirty();
      });
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
    const nextDirty = new Set<RecordKey>();
    COMMON_KEYS.forEach((k) => {
      const inst = itemHandles.current[k];
      if (!inst) return;
      if (inst.isSaving()) {
        if (inst.hasChanges()) nextDirty.add(k);
        return;
      }
      inst.resetDraft();
      if (inst.hasChanges()) nextDirty.add(k);
    });
    setDirtyKeys(nextDirty);
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
  isSaving: () => boolean;
};

type RecordItemProps = {
  name: string;
  textKey: RecordKey;
  editing: boolean;
  onDirtyChange: (key: RecordKey, isDirty: boolean) => void;
};

const RecordItem = forwardRef<RecordItemHandle, RecordItemProps>(
  function RecordItem({ name, textKey, editing, onDirtyChange }, ref) {
    const {
      value,
      originalValue,
      isLoading,
      isVerified,
      isPending,
      isConfirming,
      isSaveDisabled,
      isUnchanged,
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
    } = useRecordText(name, textKey);
    const [openVerifyModal, setOpenVerifyModal] = useState(false);
    const [openTwitterProof, setOpenTwitterProof] = useState(false);

    const label = labelForKey(textKey);

    useEffect(() => {
      onDirtyChange(textKey, !isUnchanged);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isUnchanged]);

    useImperativeHandle(ref, () => ({
      async saveIfDirty() {
        if (isUnchanged || isPending || isConfirming) return false;
        await save();
        return true;
      },
      resetDraft() {
        resetDraft();
      },
      hasChanges() {
        return !isUnchanged;
      },
      isSaving() {
        return Boolean(isPending || isConfirming);
      },
    }));

    // Hide empty values when not editing (use on-chain data, not draft)
    const viewValue = originalValue;
    if (!editing && !viewValue) return null;

    return (
      <li className="name-card">
        <div className="record-grid">
          <div className="record-label">{label}</div>

          {editing ? (
            <>
              <div className="record-input-row">
                {textKey === "description" ? (
                  <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
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
                    onChange={(e) => onChange(e.target.value)}
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
                    onClick={save}
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
              {textKey === "email" && isVerifiable && value ? (
                <div className="record-input-row" style={{ marginTop: 4 }}>
                  {isVerified ? (
                    <span
                      className="success-inline"
                      style={{ alignSelf: "center" }}
                    >
                      <span className="dot" aria-hidden />
                      <span>Verified.</span>
                    </span>
                  ) : (
                    <span
                      className="warning-inline"
                      style={{ alignSelf: "center" }}
                    >
                      <span className="dot" aria-hidden />
                      <span>Email not verified.</span>
                      <button
                        className="link-cta"
                        onClick={() => setOpenVerifyModal(true)}
                      >
                        Click here to verify
                      </button>
                    </span>
                  )}
                </div>
              ) : null}
              {textKey === "com.twitter" && isVerifiable && value ? (
                <div className="record-input-row" style={{ marginTop: 4 }}>
                  {isVerified ? (
                    <span
                      className="success-inline"
                      style={{ alignSelf: "center" }}
                    >
                      <span className="dot" aria-hidden />
                      <span>Verified.</span>
                    </span>
                  ) : (
                    <span
                      className="warning-inline"
                      style={{ alignSelf: "center" }}
                    >
                      <span className="dot" aria-hidden />
                      <span>X handle not verified.</span>
                      <button
                        className="link-cta"
                        onClick={() => setOpenTwitterProof(true)}
                      >
                        Click here to verify
                      </button>
                    </span>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <div className="record-value">
              {renderValue(textKey, viewValue)}
              {isVerifiable && viewValue ? (
                <span
                  className="help-text"
                  style={{
                    marginLeft: 8,
                    color: isVerified ? "#16a34a" : "#ef4444",
                  }}
                >
                  {isVerified ? "Verified" : "Not verified"}
                </span>
              ) : null}
            </div>
          )}
          <Modal
            open={openVerifyModal}
            onClose={() => setOpenVerifyModal(false)}
            title="Verify your email"
            footer={
              <>
                <button
                  className="link-cta"
                  onClick={() => setOpenVerifyModal(false)}
                >
                  Close
                </button>
                <button
                  className="nav-cta"
                  onClick={requestVerification}
                  disabled={verifyRequesting}
                >
                  {verifyRequesting
                    ? "Sending…"
                    : verifyRequested
                      ? "Resend"
                      : "Send verification"}
                </button>
              </>
            }
          >
            <p>
              We’ll send an email to the address you entered. Reply to that
              email with the word
              <strong> confirm</strong>. Our backend will verify and update
              on-chain. Once done, you’ll see this email marked as verified.
            </p>
            {verifyRequested && !isVerified ? (
              <p className="help-text">
                Email sent. Waiting for your confirmation reply…
              </p>
            ) : null}
            {verifyError ? (
              <p className="help-text error" role="alert">
                {verifyError}
              </p>
            ) : null}
          </Modal>
          {textKey === "com.twitter" ? (
            <TwitterProofModal
              open={openTwitterProof}
              onClose={() => setOpenTwitterProof(false)}
              ensName={name}
            />
          ) : null}
        </div>
      </li>
    );
  }
);

// Placeholders are part of records feature
import { placeholderForKey } from "../features/records/placeholders";

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

// Modal rendering outside the component body is not possible; include within list item
// but defined here for clarity in diffs.
