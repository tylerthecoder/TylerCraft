import { Vector3D } from "./vector.js";


export function getOppositeCubeFace(face: number) {
  return face % 2 === 0 ? face + 1 : face - 1;
}

export function faceVectorToFaceNumber(vector: Vector3D): number {

  const index = (Vector3D
    .unitVectors
    .map((val, index) => [val, index] as [Vector3D, number])
    .find(([val, index]) => val.equals(vector)) ?? [-1, -1]
  )[1];

  if (index === -1) {
    throw new Error("Couldn't find face vector");
  }

  return index;
}

export function faceNumberToFaceVector(faceIndex: number): Vector3D {
  return Vector3D.unitVectors[faceIndex];
}