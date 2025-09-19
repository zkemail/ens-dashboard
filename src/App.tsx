import "./App.css";
import { Web3Provider } from "./components/Web3Provider";
import { ConnectKitButton } from "connectkit";

function App() {
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
