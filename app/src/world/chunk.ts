import { Cube } from "../entities/cube";
import { Entity } from "../entities/entity";
import { IDim } from "../../types";
import { getRandEle, arrayMul, arrayCompare, arrayAdd, arrayCross, arrayDot, arrayScalarMul, roundToNPlaces } from "../utils";
import { BLOCK_DATA, BLOCK_TYPES } from "../blockdata";
import { Game } from "../game";
import { Camera } from "../../client/cameras/camera";

export const CHUNK_SIZE = 5;

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
        // const type = getRandEle(Object.keys(BLOCK_DATA)) as BLOCK_TYPES;
        const type = "grass";
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
    const cameraDir = camera.rotUnitVector;

    let firstIntersection: IDim;

    const hitCube = this.cubes.filter(cube => {
      // check each face for collision
      // to define all of the faces of the cubes we will use the normal for each face

      const topFaceNormal = [0, 1, 0] as IDim;
      const pointOnTopFace = arrayAdd(cube.pos, [0, 1, 0]);
      const n = topFaceNormal;
      const p = pointOnTopFace;

      // this d is the d in the equation for a plane: ax + by = cz = d
      const d = arrayDot(n, p);

      // t is the "time" at which the line intersects the plane, it is used to find the point of intersection
      const t = (d - arrayDot(n, camera.pos)) / arrayDot(n, cameraDir);

      // now find the point where the line intersections this plane (y = mx + b)

      const debug_mult = arrayScalarMul(cameraDir, t);

      const intersection = arrayAdd(debug_mult, camera.pos);

      // we here make the arbutairy decision that the game will have 5 points of persision when rounding
      const roundedIntersection = intersection.map(num => roundToNPlaces(num, 5)) as IDim;

      if (!firstIntersection) {
        firstIntersection = roundedIntersection;
      }

      // check to see if this intersection is within the face (Doing the whole cube for now, will switch to face later)
      const hit = cube.isPointInsideMe(roundedIntersection);

      // console.log(t, debug_mult, intersection, cameraDir)

      return hit;
    });

    // DEBUG
    this.addCube(new Cube(
      "stone",
      firstIntersection,
      [.1, .1, .1]
    ));

    // this.addCube(new Cube(
    //   "stone",
    //   camera.pos,
    //   [.1, .1, .1]
    // ));

    return hitCube;
  }

  addCube(cube: Cube) {
    console.log("Addede cube to chunk: ", cube);
    this.cubes.push(cube);
    this.game.actions.push({
      blockUpdate: this,
    });
  }

}
