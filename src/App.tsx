import "./App.css";
import { Web3Provider } from "./components/Web3Provider";
import { ConnectKitButton } from "connectkit";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useEnsName } from "wagmi";
import { useEnsNamesForAddress } from "./hooks/useEnsNames";

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
  const { address, isConnected, chainId } = useAccount();
  const { data: ensName } = useEnsName({
    address,
    query: { enabled: Boolean(isConnected && address) },
    chainId: useAccount().chainId,
  });
  const {
    names: ownedNames,
    isLoading: isLoadingNames,
    error: namesError,
  } = useEnsNamesForAddress({
    address: (address ?? "0x") as `0x${string}`,
    chainId,
    pageSize: 20,
    orderBy: "createdAt",
    orderDirection: "desc",
  });

  const [showSubdomains, setShowSubdomains] = useState(false);

  const { initialList, remainingSubdomains, subdomainCount } = useMemo(() => {
    const all = [...(ownedNames ?? [])].filter(Boolean);
    const isSub = (n: string) => n.split(".").length > 2;

    // Remove any duplicate of primary before reordering
    if (ensName) {
      const idx = all.findIndex(
        (n) => n.toLowerCase() === ensName.toLowerCase()
      );
      if (idx !== -1) all.splice(idx, 1);
    }

    const topLevel = all.filter((n) => n.split(".").length === 2);
    const subdomains = all.filter(isSub);

    const list: string[] = [];
    // Always include primary at the top if present
    if (ensName) list.push(ensName);
    // Then include all .eth and other TLD names
    list.push(...topLevel);

    const restSubs =
      ensName && isSub(ensName)
        ? subdomains.filter((n) => n.toLowerCase() !== ensName.toLowerCase())
        : subdomains;

    return {
      initialList: list,
      remainingSubdomains: restSubs,
      subdomainCount: restSubs.length,
    };
  }, [ownedNames, ensName]);

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
            <>
              <p className="subtitle">
                Connected as{" "}
                {ensName ? `${ensName} (${shortAddress})` : shortAddress}
              </p>
              <div className="ens-list">
                {isLoadingNames ? (
                  <p className="muted">Loading ENS names…</p>
                ) : namesError ? (
                  <p className="muted">Could not load ENS names.</p>
                ) : initialList && initialList.length > 0 ? (
                  <ul className="list">
                    {initialList.map((name) => (
                      <li key={name} className="list-item">
                        <span>{name}</span>
                        {ensName && name === ensName ? (
                          <span className="badge">primary</span>
                        ) : null}
                      </li>
                    ))}
                    {showSubdomains &&
                      remainingSubdomains.map((name) => (
                        <li key={name} className="list-item">
                          <span>{name}</span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="muted">No ENS names found for this address.</p>
                )}
              </div>
              {subdomainCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: 12,
                  }}
                >
                  <button
                    className="nav-cta"
                    onClick={() => setShowSubdomains((v) => !v)}
                  >
                    {showSubdomains
                      ? "Hide subdomains"
                      : `Show ${subdomainCount} subdomain${
                          subdomainCount > 1 ? "s" : ""
                        }`}
                  </button>
                </div>
              )}
            </>
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
