import { Entity } from "../../src/entities/entity";
import { Player } from "../../src/entities/player";
import { Camera } from "../../src/camera";
import { ClientGame } from "../clientGame";
import { Game } from "@tylercraft/src/game";

export type Controlled = Entity | Camera | ClientGame | Player;


export abstract class GameController {
  constructor(
    protected game: ClientGame,
  ) { }
  abstract update(delta: number): void;
}

export abstract class Controller {
  abstract controlled: Controlled;
  abstract update(delta: number): void;
}
