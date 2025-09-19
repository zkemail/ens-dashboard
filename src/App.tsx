import "./App.css";
import { Web3Provider } from "./components/Web3Provider";
import { ConnectKitButton } from "connectkit";
import { useEffect, useState } from "react";

function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return (
    <Web3Provider>
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
          <div className="nav-actions">
            <button
              className="theme-toggle"
              aria-label="Toggle theme"
              onClick={toggleTheme}
              title={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              <span aria-hidden>{theme === "dark" ? "🌙" : "☀️"}</span>
              <span className="sr-only">Toggle theme</span>
            </button>
            <ConnectKitButton />
          </div>
        </div>
      </header>

      <main>
        <section className="container hero">
          <h1 className="title">Ens Integration</h1>
          <p className="subtitle">
            Connect your wallet to the Ens Integration.
          </p>
        </section>
      </main>
    </Web3Provider>
  );
}

export default App;
