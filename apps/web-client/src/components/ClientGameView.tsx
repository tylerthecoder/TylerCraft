import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { run } from "../runner";

export function ClientGameView() {
  const { gameId } = useParams<{ gameId: string }>();
  const [isJoined, setIsJoined] = useState(false);

  if (!gameId) {
    return <div>No game ID provided</div>;
  }

  function joinGame(gameId: string) {
    run(gameId);
    setIsJoined(true);
  }

  useEffect(() => {
    joinGame(gameId);
  }, [gameId]);

  if (isJoined) {
    return <div></div>;
  }

  return <div>Loading...</div>;
}
