import React, { useState } from "react";
import { run, create } from "../services/sp-games-service";
import { RunningGameView } from "./RunningGameView";
import { useNavigate, useParams } from "react-router-dom";
import { CreateGameOptions } from "@craft/rust-world";

export function ClientGameView() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const defaultOptions = CreateGameOptions.default();
  const [gameName, setGameName] = useState(defaultOptions.name);
  const [seed, setSeed] = useState(defaultOptions.seed);
  const [flatWorld, setFlatWorld] = useState(defaultOptions.flatWorld);
  const [flatWorldHeight, setFlatWorldHeight] = useState(
    defaultOptions.flatWorldHeight
  );
  const [debugWorld, setDebugWorld] = useState(defaultOptions.debugWorld);

  async function createGame() {
    const options = new CreateGameOptions(
      gameName,
      flatWorld,
      flatWorldHeight,
      debugWorld,
      seed
    );
    const id = await create(options);
    navigate(`/client-game/${id}`);
  }

  if (!gameId) {
    return (
      <div>
        Create Game
        <div>
          <label>Game Name</label>
          <input
            type="text"
            placeholder="Game Name"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
          />
        </div>
        <div>
          <label>Seed</label>
          <input
            type="number"
            placeholder="Seed"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
          />
        </div>
        <div>
          <label>Flat World</label>
          <input
            type="checkbox"
            placeholder="Flat World"
            checked={flatWorld}
            onChange={(e) => setFlatWorld(e.target.checked)}
          />
        </div>
        <div>
          <label>Flat World Height</label>
          <input
            type="number"
            placeholder="Flat World Height"
            value={flatWorldHeight}
            onChange={(e) => setFlatWorldHeight(Number(e.target.value))}
          />
        </div>
        <div>
          <label>Debug World</label>
          <input
            type="checkbox"
            placeholder="Debug World"
            checked={debugWorld}
            onChange={(e) => setDebugWorld(e.target.checked)}
          />
        </div>
        <button onClick={createGame}>Create Game</button>
      </div>
    );
  }

  return <RunningGameView runFn={run} backUrl="/client" gameId={gameId} />;
}
