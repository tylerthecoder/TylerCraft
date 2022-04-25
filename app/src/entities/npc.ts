import { IDim } from "../types";
import { Vector3D } from "../utils/vector";
import { Entity, FaceLocater } from "./entity";
import { Player } from "./player";


export class NPC extends Player {
	constructor(
		pos: Vector3D,
		dim: IDim,
		rot: Vector3D
	) {
		super(false, "npc");
		this.pos = pos;
		this.dim = dim;
		this.rot = rot;
	}


	update(_delta: number): void {
		throw new Error("Method not implemented.");
	}

	hit(_entity: Entity, _where: FaceLocater): void {
		throw new Error("Method not implemented.");
	}
}