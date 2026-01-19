import "./App.css";
import { Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ProfilePage } from "./pages/ProfilePage";
import { BenchmarkPage } from "./pages/BenchmarkPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/name/:ensName" element={<ProfilePage />} />
      <Route path="/benchmark" element={<BenchmarkPage />} />
    </Routes>
  );
}

export default App;
