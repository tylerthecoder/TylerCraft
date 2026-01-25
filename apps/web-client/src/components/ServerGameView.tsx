import React, { useState } from "react";
import { run, create } from "../services/mp-games-service";
import { RunningGameView } from "./RunningGameView";
import { useNavigate, useParams } from "react-router-dom";
import { CreateGameOptions } from "@craft/rust-world";

export function ServerGameView() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [gameName, setGameName] = useState("");
  const [flatWorld, setFlatWorld] = useState(false);
  const [flatWorldHeight, setFlatWorldHeight] = useState(0);
  const [debugWorld, setDebugWorld] = useState(false);
  const [seed, setSeed] = useState(0);

  async function createGame() {
    const id = await create(
      new CreateGameOptions(
        gameName,
        flatWorld,
        flatWorldHeight,
        debugWorld,
        seed
      )
    );
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
        <input
          type="number"
          placeholder="Flat World Height"
          value={flatWorldHeight}
          onChange={(e) => setFlatWorldHeight(Number(e.target.value))}
        />
        <input
          type="checkbox"
          placeholder="Debug World"
          checked={debugWorld}
          onChange={(e) => setDebugWorld(e.target.checked)}
        />
        <input
          type="number"
          placeholder="Seed"
          value={seed}
          onChange={(e) => setSeed(Number(e.target.value))}
        />
        <input
          type="checkbox"
          placeholder="Flat World"
          checked={flatWorld}
          onChange={(e) => setFlatWorld(e.target.checked)}
        />
        <button onClick={createGame}>Create Game</button>
      </div>
    );
  }

  return <RunningGameView runFn={run} backUrl="/server" gameId={gameId} />;
}
