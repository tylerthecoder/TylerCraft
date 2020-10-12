import { Entity } from "../../src/entities/entity";
import { Player } from "../../src/entities/player";
import { Camera } from "../cameras/camera";
import { ClientGame} from "../clientGame";

export type Controlled = Entity | Camera | ClientGame | Player;

export abstract class Controller {
  abstract controlled: Controlled;
  abstract update(delta: number): void;
}
