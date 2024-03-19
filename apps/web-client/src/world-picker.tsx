import React from "react";
import { IGameMetadata } from "@craft/engine";

interface Props {
  games: IGameMetadata[];
  onGameSelect: (game: IGameMetadata) => void;
  onNewGame: () => void;
}

export const renderWorldPicker = (props: Props) => {
  return (
    <div id="GamePickers">
      {props.games.map((game) => (
        <button onClick={() => props.onGameSelect(game)}>{game.name}</button>
      ))}
      <button onClick={props.onNewGame}>New Game</button>
    </div>
  );
};
