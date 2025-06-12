import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { run, spGameService } from "../runner";
import { GameConfigMenu } from "./GameConfigMenu";

export function ClientGameView() {
  const { gameId } = useParams<{ gameId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [gameExists, setGameExists] = useState<boolean | null>(null);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [gameInstance, setGameInstance] = useState<any>(null);

  if (!gameId) {
    return <div>No game ID provided</div>;
  }

  useEffect(() => {
    // Check if game exists when component mounts
    spGameService.getGame(gameId).then((game) => {
      setIsLoading(false);
      if (game) {
        setGameExists(true);
        // Auto-join existing game
        run(gameId).then(() => {
          // Access the global game instance
          setGameInstance((window as any).game?.game);
        });
      } else {
        setGameExists(false);
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

  const handleConfigSubmit = () => {
    // Create and join new game with config
    run(gameId).then(() => {
      // Access the global game instance
      setGameInstance((window as any).game?.game);
      setGameExists(true);
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (gameExists === false) {
    return <div>Game does not exist</div>;
  }

  return (
    <div>
      <div
        style={{
          position: "fixed",
          top: "10px",
          right: "10px",
          zIndex: 100,
          display: "flex",
          gap: "10px",
        }}
      >
        <button className="menu-button" onClick={() => setShowConfigMenu(true)}>
          Game Config (ESC)
        </button>
      </div>

      {gameInstance && (
        <GameConfigMenu
          game={gameInstance}
          isOpen={showConfigMenu}
          onClose={() => setShowConfigMenu(false)}
        />
      )}
    </div>
  );
}
