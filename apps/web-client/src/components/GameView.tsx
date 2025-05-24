import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { startGame, serverRunner } from "../services/mp-games-service";

function GameView() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [isJoined, setIsJoined] = useState(false);

  if (!gameId) {
    return <div>No game ID provided</div>;
  }

  function joinGame(gameId: string) {
    serverRunner(gameId);
    setIsJoined(true);
  }

  if (isJoined) {
    return <div></div>;
  }

  return (
    <div>
      <button onClick={() => navigate("/")} style={{ marginBottom: "20px" }}>
        ← Back to Games
      </button>
      <h2>Game {gameId}</h2>
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => {
            startGame(gameId);
          }}
        >
          Start Game
        </button>
        <button
          onClick={() => {
            joinGame(gameId);
          }}
        >
          Join Game
        </button>
      </div>
    </div>
  );
}

export default GameView;
