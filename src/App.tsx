import "./App.css";
import { Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ProfilePage } from "./pages/ProfilePage";
import { BenchmarkPage } from "./pages/BenchmarkPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { VerifyPage } from "./pages/VerifyPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/name/:ensName" element={<ProfilePage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/benchmark" element={<BenchmarkPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
    </Routes>
  );
}

export default App;
