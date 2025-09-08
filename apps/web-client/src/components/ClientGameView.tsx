import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { run, spGameService } from "../runner";
import { GameConfigMenu } from "./GameConfigMenu";
import { GameRendererGameScript } from "../game-scripts/canvas-gscript";

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
        <button className="option-button" onClick={() => navigate("/client")}>
          Back To Client Games
        </button>
      </div>
    );
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
