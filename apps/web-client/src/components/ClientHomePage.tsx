import { IGameMetadata } from "@craft/engine";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { spGameService } from "../runner";

export function ClientHomePage() {
  const [games, setGames] = useState<IGameMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const newGame = async () => {
    console.log("Starting game");
    const game = spGameService.newGame();
    spGameService.saveGame(game);
    navigate(`/client-game/${game.game.id}`);
  };

  useEffect(() => {
    spGameService.getAllGames().then((games) => {
      setGames(games);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-10">
      <div className="backButton" onClick={() => navigate("/")}>
        ⬅
      </div>
      <h1 className="text-4xl font-bold text-center">Local Games</h1>
      <div className="flex flex-col items-center justify-center">
        {games.length > 0 &&
          games.map((game) => (
            <div key={game.gameId}>
              <button onClick={() => navigate(`/client-game/${game.gameId}`)}>
                {game.name || game.gameId}
              </button>
            </div>
          ))}
        {games.length === 0 && <p>No games available</p>}
        <button onClick={newGame}>Create Game</button>
      </div>
    </div>
  );
}
