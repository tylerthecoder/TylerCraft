import React, { useState } from "react";
import { run, create } from "../services/sp-games-service";
import { RunningGameView } from "./RunningGameView";
import { useNavigate, useParams } from "react-router-dom";

export function ClientGameView() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [gameName, setGameName] = useState("");

  async function createGame() {
    const id = await create(gameName);
    navigate(`/client-game/${id}`);
  }

  if (!gameId) {
    return (
      <div>
        Create Game
        <input
          type="text"
          placeholder="Game Name"
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
        />
        <button onClick={createGame}>Create Game</button>
      </div>
    );
  }

  return <RunningGameView runFn={run} backUrl="/client" gameId={gameId} />;
}
