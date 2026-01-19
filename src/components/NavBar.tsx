import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function NavBar({ right }: { right?: ReactNode }) {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="brand">
          <Link to="/" aria-label="Go home">
            <img
              src="/ZKEmailLogo-light.svg"
              alt="zkemail"
              className="logo dark"
              height={24}
            />
            <img
              src="/ZKEmailLogo-dark.svg"
              alt="zkemail"
              className="logo light"
              height={24}
            />
          </Link>
        </div>
        <div className="nav-actions">
          {/* <Link to="/benchmark" className="nav-cta">
            Benchmark
          </Link> */}
          {right}
        </div>
      </div>
    </header>
  );
}
