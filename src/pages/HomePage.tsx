import { useMemo, useState } from "react";
import { ConnectKitButton } from "connectkit";
import { useAccount, useEnsName } from "wagmi";
import { useEnsNamesForAddress } from "../hooks/useEnsNames";
import { NavBar } from "../components/NavBar";
import { ThemeToggle } from "../components/ThemeToggle";
import { NameCard } from "../components/NameCard";
import { colorForName } from "../utils/color";

export function HomePage() {
  const { address, isConnected, chainId } = useAccount();
  const { data: ensName } = useEnsName({
    address,
    query: { enabled: Boolean(isConnected && address) },
    chainId,
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

    if (ensName) {
      const idx = all.findIndex(
        (n) => n.toLowerCase() === ensName.toLowerCase()
      );
      if (idx !== -1) all.splice(idx, 1);
    }

    const topLevel = all.filter((n) => n.split(".").length === 2);
    const subdomains = all.filter(isSub);

    const list: string[] = [];
    if (ensName) list.push(ensName);
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

  return (
    <>
      <NavBar
        right={
          <>
            <ThemeToggle />
            <ConnectKitButton />
          </>
        }
      />
      <main>
        <section className="container hero">
          {isConnected ? (
            <>
              <p className="subtitle">
                Connected as{" "}
                {ensName ?? address?.slice(0, 6) + "…" + address?.slice(-4)}
              </p>
              <div className="ens-list">
                {isLoadingNames ? (
                  <p className="muted">Loading ENS names…</p>
                ) : namesError ? (
                  <p className="muted">Could not load ENS names.</p>
                ) : initialList && initialList.length > 0 ? (
                  <ul className="list">
                    {initialList.map((name) => (
                      <NameCard
                        key={name}
                        name={name}
                        color={colorForName(name)}
                        badge={
                          ensName && name === ensName ? "primary" : undefined
                        }
                      />
                    ))}
                    {showSubdomains &&
                      remainingSubdomains.map((name) => (
                        <NameCard
                          key={name}
                          name={name}
                          color={colorForName(name)}
                        />
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
