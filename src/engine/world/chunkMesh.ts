// A chunk mesh is a holder class for the visible faces of a chunk

import { BlockMetaData } from "../blockdata.js";
import { Cube } from "../index.js";
import WorldModule from "../modules.js";
import { IDim } from "../types.js";
import { Direction, Vector2D } from "../utils/vector.js";

export class ChunkMesh {

	constructor(
		public mesh: Array<{block: Cube, faces: Direction[]}>,
    public chunkPos: {x: number, y: number}
	) { }




}
