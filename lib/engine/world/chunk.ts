import { Cube } from "../entities/cube.js";
import { Direction, Vector2D } from "../utils/vector.js";
import { BlockType } from "@craft/rust-world";
export interface ILookingAtData {
  cube: Cube;
  face: Direction;
  dist: number;
}

export interface ISerializedChunk {
  position: {
    x: number;
    y: number;
  };
  blocks: BlockType[];
  block_data: ("None" | { Image: string })[];
}

export const getChunkId = (serChunk: ISerializedChunk) => {
  const vec = new Vector2D([serChunk.position.x, serChunk.position.y]);
  return vec.toIndex();
};

export type ISerializedVisibleFaces = Array<{
  world_pos: { x: 0; y: 0; z: 0 };
  faces: [boolean, boolean, boolean, boolean, boolean, boolean];
}>;
