import "./App.css";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import Pay from "./features/pay/Pay";
import Claim from "./features/claim/Claim";

function App() {
  const location = useLocation();

  return (
    <div>
      <nav className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
            <img
              src="/favicon-light.svg"
              alt="Socials"
              style={{
                height: "28px",
                width: "28px",
              }}
            />
            <span>socials</span>
          </Link>
          <div className="nav-actions">
            <Link
              to="/"
              className="nav-cta"
              aria-current={location.pathname === "/" ? "page" : undefined}
            >
              Tip X Handle
            </Link>
            <Link
              to="/claim"
              className="nav-cta"
              aria-current={location.pathname === "/claim" ? "page" : undefined}
            >
              Claim Tips
            </Link>
          </div>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Pay />} />
        <Route path="/claim" element={<Claim />} />
      </Routes>
    </div>
  );
}

export default App;
