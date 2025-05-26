import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./components/HomePage";
import { ServerGameView } from "./components/ServerGameView";
import { ServerHomePage } from "./components/ServerHomePage";
import { ClientHomePage } from "./components/ClientHomePage";
import { ClientGameView } from "./components/ClientGameView";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/server" element={<ServerHomePage />} />
        <Route path="/client" element={<ClientHomePage />} />
        <Route path="/server-game/:gameId" element={<ServerGameView />} />
        <Route path="/client-game/:gameId" element={<ClientGameView />} />
      </Routes>
    </Router>
  );
}

export default App;
