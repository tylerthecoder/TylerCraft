import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { run, RunningGame, spGameService } from "../services/sp-games-service";
import { GameConfigMenu } from "./GameConfigMenu";
import { GameRendererGameScript } from "../renders/game-renderer";
import { MenuButton } from "./ui/Buttons";

GameRendererGameScript.register();

export function ClientGameView() {
  const { gameId } = useParams<{ gameId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [gameExists, setGameExists] = useState<boolean | null>(null);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [gameInstance, setGameInstance] = useState<RunningGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!gameId) {
    return <div>No game ID provided</div>;
  }

  useEffect(() => {
    spGameService.hasGame(gameId).then((gameExists) => {
      setIsLoading(false);
      setGameExists(gameExists);
      if (gameExists) {
        run(gameId)
          .then((runningGame) => {
            if ("game" in runningGame) {
              // Access the global game instance
              setGameInstance(runningGame);
            } else {
              setError(runningGame.error);
            }
          })
          .catch((err) => {
            console.error(err);
            setError(err);
          });
      }
    });
  }, [gameId]);

  useEffect(() => {
    // Add keyboard shortcut for config menu (ESC key)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && gameExists) {
        setShowConfigMenu(!showConfigMenu);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showConfigMenu, gameExists]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (gameExists === false) {
    return <div>Game does not exist</div>;
  }

  if (error) {
    return (
      <div>
        {" "}
        There was an error, Check the console for more details:{" "}
        {JSON.stringify(error)} <br />
        <MenuButton onClick={() => navigate("/client")}>
          Back To Client Games
        </MenuButton>
      </div>
    );
  }

  return (
    <div>
      <div className="fixed top-2 right-2 z-[100] flex gap-2">
        <MenuButton onClick={() => setShowConfigMenu(true)}>
          Game Config (ESC)
        </MenuButton>
      </div>

      {gameInstance && (
        <GameConfigMenu
          runningGame={gameInstance}
          isOpen={showConfigMenu}
          onClose={() => setShowConfigMenu(false)}
        />
      )}
    </div>
  );
}
