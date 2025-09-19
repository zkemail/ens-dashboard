import "./App.css";
import { Web3Provider } from "./components/Web3Provider";
import { Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ProfilePage } from "./pages/ProfilePage";

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

export default App;
