import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { run, RunningGame } from "../services/sp-games-service";
import { GameConfigMenu } from "./GameConfigMenu";
import { GameRendererGameScript } from "../renders/game-renderer";
import { MenuButton } from "./ui/Buttons";

GameRendererGameScript.register();

export function ClientGameView() {
  const { gameId } = useParams<{ gameId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [gameInstance, setGameInstance] = useState<RunningGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const loadingMessageRef = useRef<HTMLDivElement>(null);

  async function startGame(gameId?: string) {
    const updateLoadingMessage = (message: string) => {
      console.log("Updating loading message", message);
      if (loadingMessageRef.current) {
        console.log("Updating loading message", message);
        loadingMessageRef.current.innerHTML = message;
      }
    };

    try {
      const runningGame = await run(updateLoadingMessage, gameId);
      if ("game" in runningGame) {
        setGameInstance(runningGame);
      } else {
        setError(runningGame.error);
      }
    } catch (err) {
      setError(err as string);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    startGame(gameId);
  }, [gameId]);

  useEffect(() => {
    if (!gameInstance) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowConfigMenu(!showConfigMenu);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showConfigMenu, gameInstance]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <img src="/img/loading.gif" alt="Loading" className="w-10 h-10" />
        <div className="text-center" ref={loadingMessageRef}>
          {" "}
        </div>
      </div>
    );
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
