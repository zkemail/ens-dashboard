import "./App.css";
import { Web3Provider } from "./components/Web3Provider";
import { Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ProfilePage } from "./pages/ProfilePage";

// legacy page code extracted to pages

function App() {
  return (
    <Web3Provider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/name/:ensName" element={<ProfilePage />} />
      </Routes>
    </Web3Provider>
  );
}

// Profile & Home pages moved to ./pages

export default App;
