import { Game, GameScript } from "@craft/engine";
import React from "react";
import ReactDOM, { render } from "react-dom";
import { getEleOrError } from "../../utils";
import { ParkorGScript } from "@craft/engine/game-scripts/parkor-gscript";
import { ParkorHUD } from "./parkor-hud";

class ParkorRenderGScript extends GameScript {
  public eMenuContainer = getEleOrError<HTMLDivElement>("menuContainer");

  constructor(game: Game, private parkorGameScript: ParkorGScript) {
    super(game);
  }

  update(delta: number): void {
    this.render();
  }

  render(): void {
    ReactDOM.render(
      React.createElement(ParkorHUD, {
        score: this.parkorGameScript,
      }),
      this.eMenuContainer
    );
  }
}
