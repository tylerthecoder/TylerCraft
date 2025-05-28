import { IServerGameMetadata } from "@craft/engine";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createGame, getAllGames } from "../services/mp-games-service";

export function ServerHomePage() {
  const [games, setGames] = useState<IServerGameMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const createGameWrapper = async (gameId: string) => {
    console.log("Starting game", gameId);
    const game = await createGame(gameId);
    navigate(`/server-game/${game}`);
  };

  useEffect(() => {
    getAllGames().then((games) => {
      setGames(games);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>TylerCraft Games</h1>
      <div>
        <h2>Existing Games</h2>
        {games.length > 0 ? (
          <div>
            {games.map((game) => (
              <div
                key={game.gameId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px",
                  border: "1px solid #ccc",
                  margin: "5px 0",
                  borderRadius: "4px",
                }}
              >
                <span>{game.name}</span>
                <button onClick={() => navigate(`/server-game/${game.gameId}`)}>
                  View Game
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>No games available</p>
        )}
      </div>
      <div style={{ marginTop: "20px" }}>
        <h2>Create New Game</h2>
        <button
          onClick={() => {
            createGameWrapper("test");
          }}
        >
          Create Game
        </button>
      </div>
    </div>
  );
}
