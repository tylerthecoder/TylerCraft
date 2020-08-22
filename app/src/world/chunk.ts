import { Cube } from "../entities/cube";
import { Entity } from "../entities/entity";
import { IDim } from "../../types";
import { getRandEle, arrayMul, arrayCompare, arrayAdd, arrayCross, arrayDot, arrayScalarMul, roundToNPlaces, arrayDist, arrayDistSquared } from "../utils";
import { Game } from "../game";
import { CONFIG } from "../constants";
import Random from "../utils/random";


export class Chunk {
  cubes: Cube[] = [];
  uid: string;

  constructor(
    public chunkPos: number[],
    private game: Game
  ) {
    this.generate();
    this.uid = `${chunkPos[0]}, ${chunkPos[1]}`;
  }

  get pos() {
    return [this.chunkPos[0] * CONFIG.chunkSize, 0, this.chunkPos[1] * CONFIG.chunkSize];
  }

  getDistanceFromWorldPoint(point: IDim) {

  }

  // use seed later down the line
  generate() {
    for (let i = 0; i < CONFIG.chunkSize; i++) {
      for (let j = 0; j < CONFIG.chunkSize; j++) {
        const x = this.pos[0] + i;
        const z = this.pos[2] + j;
        const y = Math.floor(Random.noise(x, z) * 2 - 1);
        const cubePos = [x, y, z];
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
    const scaledPos = cube.pos.map(dim => Math.floor(dim / CONFIG.chunkSize));

    return scaledPos[0] === this.chunkPos[0] && scaledPos[2] === this.chunkPos[1];

  }

  lookingAt(cameraPos: IDim, cameraDir: IDim) {

    let firstIntersection: IDim;

    const faceNormals: IDim[] = [
      [1, 0, 0],
      [-1, 0 , 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ]

    // [dist, faceVector( a vector, when added to the cubes pos, gives you the pos of a new cube if placed on this block)]
    const defaultBest: [number, IDim, Cube?] = [Infinity, [-1, -1, -1]];

    const newCubePosData = this.cubes.reduce((bestFace, cube) => {
      // check each face for collision
      // to define all of the faces of the cubes we will use the normal for each face

      for (const faceNormal of faceNormals) {

        // a vector that is normalized by the cubes dimensions
        const faceVector = arrayMul(cube.dim, faceNormal.map(n => n === 1 ? 1 : 0) as IDim);

        const pointOnFace = arrayAdd(cube.pos, faceVector);

        // this d is the d in the equation for a plane: ax + by = cz = d
        const d = arrayDot(faceNormal, pointOnFace);

        // t is the "time" at which the line intersects the plane, it is used to find the point of intersection
        const t = (d - arrayDot(faceNormal, cameraPos)) / arrayDot(faceNormal, cameraDir);

        // This means that the point is behind the camera (don't know why it is negative)
        if (t > 0) {
          continue;
        }

        // now find the point where the line intersections this plane (y = mx + b)
        const mx = arrayScalarMul(cameraDir, t);
        const intersection = arrayAdd(mx, cameraPos);

        // we here make the arbutairy decision that the game will have 5 points of persision when rounding
        const roundedIntersection = intersection.map(num => roundToNPlaces(num, 5)) as IDim;

        if (!firstIntersection) {
          firstIntersection = roundedIntersection;
        }

        // check to see if this intersection is within the face (Doing the whole cube for now, will switch to face later)
        const hit = cube.isPointInsideMe(roundedIntersection);

        if (hit) {
          // we have determined that the camera is looking at this face, now see if this is the point
          // closest to the camera

          // get the squared dist so we dont have to do a bunch of sqrt operations
          const pointDist = Math.abs(arrayDistSquared(cameraPos, roundedIntersection));

          if (pointDist < bestFace[0]) {
            const newCubePos = arrayAdd(cube.pos, arrayMul(cube.dim, faceNormal));
            bestFace = [pointDist, newCubePos, cube];
          }
        }
      }

      return bestFace;

    }, defaultBest);

    // this means we didn't find a block
    if (newCubePosData[0] === Infinity)  {
      return false;
    }

    return {
      newCubePos: newCubePosData[1],
      entity: newCubePosData[2],
      dist: newCubePosData[0],
    }
  }

  addCube(cube: Cube) {
    this.cubes.push(cube);
    this.sendBlockUpdate();
  }

  removeCube(cube: Cube) {
    this.cubes = this.cubes.filter(c => cube !== c);
    this.sendBlockUpdate();
  }

  sendBlockUpdate() {
    this.game.actions.push({
      blockUpdate: {
        chunkId: this.uid,
      }
    });
  }

}
