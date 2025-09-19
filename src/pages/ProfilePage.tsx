import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import { NavBar } from "../components/NavBar";
import { ThemeToggle } from "../components/ThemeToggle";
import { RecordsList } from "../sections/RecordsList";
import { colorForName } from "../utils/color";

export function ProfilePage() {
  const { ensName = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const { isConnected } = useAccount();

  return (
    <>
      <NavBar
        right={
          <>
            <ThemeToggle />
            {location.state?.from === "home" && (
              <button className="nav-cta" onClick={() => navigate(-1)}>
                Back
              </button>
            )}
          </>
        }
      />
      <main>
        <section className="container profile">
          <div className="profile-header">
            <div
              className="profile-avatar"
              style={{ background: colorForName(ensName) }}
            >
              {(ensName || "?").charAt(0).toUpperCase()}
            </div>
            <div className="profile-meta">
              <h1 className="profile-title">{ensName}</h1>
              <p className="profile-subtitle">ENS Profile</p>
            </div>
          </div>

          {!isConnected && (
            <p className="subtitle" style={{ textAlign: "center" }}>
              Connect your wallet to load resolver records.
            </p>
          )}

          <h2 className="section-title">Records</h2>
          <RecordsList name={ensName} />
        </section>
      </main>
    </>
  );
}
