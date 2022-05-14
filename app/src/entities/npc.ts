import { IDim } from "../types";
import { Vector3D } from "../utils/vector";
import { Entity, FaceLocater } from "./entity";
import { Player } from "./player";


export class NPC extends Player {
	// Entity overrides
	pos: Vector3D = new Vector3D([0, 50, 0]);
	dim: IDim = [.8, 2, .8];
	rot = new Vector3D([0, 0, Math.PI / 2]);

	constructor() {
		super(false, "npc");
	}


	update(_delta: number): void {
		throw new Error("Method not implemented.");
	}

	hit(_entity: Entity, _where: FaceLocater): void {
		throw new Error("Method not implemented.");
	}
}