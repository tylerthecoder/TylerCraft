import { arrayAdd, arrayScalarMul } from "../../src/utils";
import { Vector, Vector3D } from "../../src/utils/vector";
import { RenderData } from "../renders/renderer";


// This class is just for getting the webgl buffers (positions, indices) for simple shapes
// will take in offsets and other constructs so other classes can use this to build bigger things
// does not build textures, yet
export class ShapeBuilderClass {

  buildFace(
    faceIndex: number, // Face index is a number 0 - 5 to represent
    renData: RenderData,
    relPos: number[],
    size: number,
    edgeTransform?: (edge: Vector3D) => Vector3D,
  ) {
    // get the dimension of the face i.e. x, y, z
    const dimensionIndex = faceIndex >> 1;

    // get the direction of the face. In or out
    const dir = faceIndex % 2 === 0 ? 1 : 0;

    // four corners of a square, centered at origin
    const square = [[0, 0], [1, 0], [1, 1], [0, 1]];

    // get a flattened array of the positions
    const vertices = square
      .map(edge => {
        const cords = arrayScalarMul(edge, size);

        // add the 3 dimension to the square
        cords.splice(dimensionIndex, 0, dir);

        // move the vertices by the cube's relative position in the chunk
        let adjustedCords = arrayAdd(cords, relPos);

        if (edgeTransform) {
          adjustedCords = edgeTransform(new Vector3D(adjustedCords)).data;
        }

        return adjustedCords;
      })
      .flat();

    // get triangle indices
    const triIndices = [0, 1, 2, 0, 2, 3].map(x => x + renData.indexOffset);

    renData.indexOffset += 4;

    renData.pushData({
      positions: vertices,
      indices: triIndices,
    });
  }

  buildX(
    renData: RenderData,
    relPos: number[],
  ) {
    const positions = Vector.xVectors.
      map(v => arrayAdd(v, relPos)).
      flat();

    const triIndices = [0, 1, 2, 0, 2, 3].map(x => x + renData.indexOffset);
    const secondTriIndices = [0, 1, 2, 0, 2, 3].map(x => x + renData.indexOffset + 4);
    const indices = [...triIndices, ...secondTriIndices];

    renData.indexOffset += 8;

    renData.pushData({
      positions,
      indices,
    });
  }

  buildBox(
    edgeFunction: (edge: Vector3D) => Vector3D,
    renData: RenderData,
  ) {
    const facesToRender = [0, 1, 2, 3, 4, 5];
    for (const face of facesToRender) {
      this.buildFace(face, renData, Vector3D.zero.data, 1, edgeFunction);
    }
  }

}


const ShapeBuilder = new ShapeBuilderClass();
export default ShapeBuilder;
