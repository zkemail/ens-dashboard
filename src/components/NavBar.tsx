import type { ReactNode } from "react";

export function NavBar({ right }: { right?: ReactNode }) {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="brand">
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
        </div>
        <div className="nav-actions">{right}</div>
      </div>
    </header>
  );
}
