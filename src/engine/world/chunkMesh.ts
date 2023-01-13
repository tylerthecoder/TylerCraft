// A chunk mesh is a holder class for the visible faces of a chunk

import { Direction } from "../utils/vector.js";



export class ChunkMesh {

	// static makeFromWasm(): ChunkMesh {

	// }


	constructor(
		private visibleFaces: {[id: string]: Direction[]}
	) { }
}