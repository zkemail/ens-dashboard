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
          <div className="brand">
            <span>socials</span>
          </div>
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
