import { Link } from "react-router-dom";

export function NameCard({
  name,
  color,
  badge,
}: {
  name: string;
  color: string;
  badge?: string;
}) {
  const href = `/name/${encodeURIComponent(name)}`;
  return (
    <li className="name-card">
      <Link to={href} className="card-link" state={{ from: "home" }}>
        <div className="name-left">
          <span className="avatar" style={{ background: color }} />
          <span className="name-text">{name}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {badge ? <span className="badge primary">{badge}</span> : null}
          <span className="pill-link">Manage</span>
        </div>
      </Link>
    </li>
  );
}
