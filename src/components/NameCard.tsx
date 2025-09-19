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
  return (
    <li className="name-card">
      <div className="name-left">
        <span className="avatar" style={{ background: color }} />
        <Link className="name-text" to={`/name/${encodeURIComponent(name)}`}>
          {name}
        </Link>
      </div>
      {badge ? <span className="badge primary">{badge}</span> : null}
    </li>
  );
}
