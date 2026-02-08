import { IServerGameMetadata } from "@craft/engine";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllGames } from "../services/mp-games-service";
import { OptionButton } from "./ui/Buttons";

export function ServerHomePage() {
  const [games, setGames] = useState<IServerGameMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const createGameWrapper = async () => {
    navigate("/server-game");
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

  console.log(games);

  return (
    <div className="p-10 relative">
      <span
        className="absolute top-2 left-2 text-4xl cursor-pointer select-none"
        onClick={() => navigate("/")}
      >
        ⬅
      </span>
      <h1 className="text-4xl font-bold text-center font-['Indie_Flower',cursive]">
        Server Games
      </h1>
      <div style={{ marginTop: "20px" }}>
        <OptionButton
          onClick={() => {
            createGameWrapper();
          }}
        >
          Create Game
        </OptionButton>
      </div>
      <div>
        <h2 className="text-2xl my-4 font-bold text-center font-['Indie_Flower',cursive]">
          Existing Games
        </h2>
        {games.length > 0 ? (
          <div>
            {games.map((game) => (
              <OptionButton
                key={game.gameId}
                onClick={() => navigate(`/server-game/${game.gameId}`)}
              >
                {game.name || game.gameId}
              </OptionButton>
            ))}
          </div>
        ) : (
          <p>No games available</p>
        )}
      </div>
    </div>
  );
}
