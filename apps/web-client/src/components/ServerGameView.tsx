import React, { useState } from "react";
import { run, create } from "../services/mp-games-service";
import { RunningGameView } from "./RunningGameView";
import { useNavigate, useParams } from "react-router-dom";

export function ServerGameView() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [gameName, setGameName] = useState("");

  async function createGame() {
    const id = await create(gameName);
    navigate(`/server-game/${id}`);
  }

  if (!gameId) {
    return (
      <div>
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

  return <RunningGameView runFn={run} backUrl="/server" gameId={gameId} />;
}
