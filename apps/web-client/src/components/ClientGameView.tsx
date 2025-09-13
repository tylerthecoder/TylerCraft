import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { run, spGameService } from "../runner";
import { GameConfigMenu } from "./GameConfigMenu";
import { GameRendererGameScript } from "../renders/game-renderer";
import { MenuButton } from "./ui/Buttons";

GameRendererGameScript.register();

export function ClientGameView() {
  const { gameId } = useParams<{ gameId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [gameExists, setGameExists] = useState<boolean | null>(null);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [gameInstance, setGameInstance] = useState<any>(null);
  const [error, setError] = useState(null);
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
          .then(() => {
            // Access the global game instance
            setGameInstance((window as any).game?.game);
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
          game={gameInstance}
          isOpen={showConfigMenu}
          onClose={() => setShowConfigMenu(false)}
          onExit={() => navigate("/client")}
        />
      )}
    </div>
  );
}
