import { IGameMetadata } from "@craft/engine";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { spGameService } from "../services/sp-games-service";
import { OptionButton } from "./ui/Buttons";

export function ClientHomePage() {
  const [games, setGames] = useState<IGameMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const newGame = async () => {
    console.log("Starting game");
    const game = spGameService.newGame();
    spGameService.saveGame(game);
    navigate(`/client-game/${game.id}`);
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
    <div className="p-10 relative">
      <div
        className="absolute top-2 left-2 text-4xl cursor-pointer select-none"
        onClick={() => navigate("/")}
      >
        ⬅
      </div>
      <h1 className="text-4xl font-bold text-center">Local Games</h1>
      <div className="flex flex-col items-center justify-center max-w-xl mx-auto w-full mt-4">
        {games.length > 0 &&
          games.map((game) => (
            <OptionButton
              key={game.gameId}
              onClick={() => navigate(`/client-game/${game.gameId}`)}
            >
              {game.name || game.gameId}
            </OptionButton>
          ))}
        {games.length === 0 && <p>No games available</p>}
        <OptionButton onClick={newGame}>Create Game</OptionButton>
      </div>
    </div>
  );
}
