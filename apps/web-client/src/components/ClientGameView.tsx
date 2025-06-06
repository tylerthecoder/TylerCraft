import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DEFAULT_CONFIG, GameConfig, run, spGameService } from "../runner";
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

  const handleConfigSubmit = (config: GameConfig) => {
    // Create and join new game with config
    run(gameId, config).then(() => {
      // Access the global game instance
      setGameInstance((window as any).game?.game);
      setGameExists(true);
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (gameExists === false) {
    return <ConfigSelector onConfigChange={handleConfigSubmit} />;
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
        <button
          onClick={() => setShowConfigMenu(true)}
          style={{
            background: "#4CAF50",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
            fontFamily: "monospace",
          }}
        >
          Game Config (ESC)
        </button>
      </div>

      <div>Game Started</div>

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

interface ConfigSelectorProps {
  onConfigChange: (config: GameConfig) => void;
}

function ConfigSelector({ onConfigChange }: ConfigSelectorProps) {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);

  return (
    <div>
      <div>
        <label>Render Distance</label>
        <input
          type="number"
          value={config.renderDistance}
          onChange={(e) =>
            setConfig({ ...config, renderDistance: parseInt(e.target.value) })
          }
        />
      </div>
      <div>
        <label>FOV Factor</label>
        <input
          type="number"
          value={config.fovFactor}
          onChange={(e) =>
            setConfig({ ...config, fovFactor: parseFloat(e.target.value) })
          }
        />
      </div>
      <button onClick={() => onConfigChange(config)}>Start Game</button>
    </div>
  );
}
