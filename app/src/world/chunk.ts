import { Cube } from "../entities/cube";
import { Entity } from "../entities/entity";
import { IDim } from "../../types";
import { getRandEle, arrayMul, arrayCompare, arrayAdd, toSphereCords, arrayCross, arrayDot, arrayScalarMul } from "../utils";
import { BLOCK_DATA, BLOCK_TYPES } from "../blockdata";
import { Game } from "../game";
import { Camera } from "../../client/cameras/camera";

export const CHUNK_SIZE = 3;

export class Chunk {
  cubes: Cube[] = [];

  constructor(public chunkPos: number[], private game: Game) {
    this.generate();
  }

  get pos() {
    return [this.chunkPos[0] * CHUNK_SIZE, 0, this.chunkPos[1] * CHUNK_SIZE];
  }

  // use seed later down the line
  generate() {
    for (let i = 0; i < CHUNK_SIZE; i++) {
      for (let j = 0; j < CHUNK_SIZE; j++) {
        const cubePos = [this.pos[0] + i, 0, this.pos[2] + j];
        const type = getRandEle(Object.keys(BLOCK_DATA)) as BLOCK_TYPES;
        const cube = new Cube(type, cubePos as IDim);
        this.cubes.push(cube);
      }
    }
  }

  // change this to chunks instead of cubes later
  isCollide(ent: Entity): Cube[] {
    const collide: Cube[] = [];
    for (const cube of this.cubes) {
      if (cube.isCollide(ent)) {
        collide.push(cube);
      }
    }
    return collide;
  }

  containsCube(cube: Cube) {
    // scale cubes position by chunk size
    const scaledPos = cube.pos.map(dim => Math.floor(dim / CHUNK_SIZE));

    return scaledPos[0] === this.chunkPos[0] && scaledPos[2] === this.chunkPos[1];

  }

  lookingAt(camera: Camera) {
    const cameraDir = toSphereCords(camera.rot[0], camera.rot[1], 1) as IDim;

    console.log("Camera", cameraDir, camera.pos)

    return this.cubes.filter(cube => {
      // check each face for collision
      // to define all of the faces of the cubes we will use the normal for each face

      const topFaceNormal = [0, 1, 0] as IDim;
      const pointOnTopFace = cube.pos;
      const n = topFaceNormal;
      const p = pointOnTopFace;

      // this d is the d in the equation for a plane: ax + by = cz = d
      const d = arrayDot(n, p);

      // t is the "time" at which the line intersects the place, it is used to find the point of intersection
      const t = (d - arrayDot(n, camera.pos)) / arrayDot(n, cameraDir);

      // now find the point where the line intersections this plane
      const intersection = arrayAdd(arrayScalarMul(cameraDir, t), camera.pos);

      console.log(t, intersection);

      // check to see if this intersection is within the face
      const otherCubeFacePoint = arrayAdd(cube.pos, [1,0,1]);

      const hit = intersection.every((ord, index) => {
        return ord >= p[index] && ord <= otherCubeFacePoint[index];
      })

      return hit;
    })
  }

  addCube(cube: Cube) {
    this.cubes.push(cube);
    this.game.actions.push({
      blockUpdate: this,
    });
  }

}
