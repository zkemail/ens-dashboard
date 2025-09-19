import { useParams, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { NavBar } from "../components/NavBar";
import { ThemeToggle } from "../components/ThemeToggle";
import { RecordsList } from "../sections/RecordsList";

export function ProfilePage() {
  const { ensName = "" } = useParams();
  const navigate = useNavigate();
  const { isConnected } = useAccount();

  return (
    <>
      <NavBar
        right={
          <>
            <ThemeToggle />
            <button className="nav-cta" onClick={() => navigate(-1)}>
              Back
            </button>
          </>
        }
      />
      <main>
        <section className="container hero">
          <h1 className="title">{ensName}</h1>
          {!isConnected && (
            <p className="subtitle">
              Connect your wallet to load resolver records.
            </p>
          )}
          <RecordsList name={ensName} />
        </section>
      </main>
    </>
  );
}
