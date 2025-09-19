import "./App.css";
import { Web3Provider } from "./components/Web3Provider";
import { ConnectKitButton } from "connectkit";
import { useEffect, useState } from "react";
import { useAccount, useEnsName } from "wagmi";

function Page() {
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
  const { address, isConnected } = useAccount();
  const { data: ensName } = useEnsName({
    address,
    query: { enabled: Boolean(isConnected && address) },
    chainId: useAccount().chainId,
  });

  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "";

  return (
    <>
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
          {isConnected ? (
            <p className="subtitle">
              Connected as{" "}
              {ensName ? `${ensName} (${shortAddress})` : shortAddress}
            </p>
          ) : (
            <>
              <p className="subtitle">
                Connect your wallet to see your existing ENS name.
              </p>
              <div className="hero-actions">
                <ConnectKitButton />
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}

function App() {
  return (
    <Web3Provider>
      <Page />
    </Web3Provider>
  );
}

export default App;
