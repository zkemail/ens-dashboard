import { useEnsText } from "wagmi";

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
  const { data, isLoading } = useEnsText({ name, key: textKey });
  return (
    <li className="name-card">
      <div className="name-left">
        <span className="avatar" style={{ background: "#64748b" }} />
        <span className="name-text">{textKey}</span>
      </div>
      <span className="name-text" style={{ textAlign: "right" }}>
        {isLoading ? "…" : data ?? "–"}
      </span>
    </li>
  );
}
