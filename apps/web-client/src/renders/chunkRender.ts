import { Renderer, RenderData } from "./renderer";
import {
  Camera,
  arraySub,
  getBlockData,
  IDim,
  ChunkMesh,
  Vector3D,
  Vector2D,
} from "@craft/engine";
import TextureMapper from "../textureMapper";
import { canvas } from "../canvas";
import { BlockShape, BlockType } from "@craft/rust-world";
import ShapeBuilder from "../services/shape-builder";

export class ChunkRenderer extends Renderer {
  private otherRenders: Renderer[] = [];

  constructor(public chunkMesh: ChunkMesh, public position: Vector2D) {
    super();
    this.setActiveTexture(canvas.textureAtlas);
    this.getBufferData();
  }

  get worldPos(): Vector3D {
    return this.position.insert(0, 1);
  }

  render(camera: Camera, trans?: boolean): void {
    // if (!this.isLoaded) return;
    this.setActiveTexture(canvas.textureAtlas);

    this.renderObject(this.worldPos.data as IDim, camera, trans);

    this.otherRenders.forEach((r) => {
      r.render(camera);
    });
  }

  // have an options to launch this on a worker thread (maybe always have it on a different thread)
  /**
   * Gets the position of each of the vertices in this chunk and adds them to the buffer
   */
  getBufferData(): void {
    // console.log("Getting Buffer Data");

    this.otherRenders = [];

    const renData = new RenderData();
    const transRenData = new RenderData(true);

    this.chunkMesh.mesh.forEach((face) => {
      const { block: cube, faces } = face;

      if (cube.type === BlockType.Void) return;

      const relativePos = arraySub(cube.pos.data, this.worldPos.data);
      const blockData = getBlockData(cube.type);
      const blockRenData = blockData.transparent ? transRenData : renData;

      switch (blockData.shape) {
        case BlockShape.Cube: {
          const texturePos = TextureMapper.getTextureCords(cube.type);
          // loop through all the faces to get their cords
          for (const direction of faces) {
            ShapeBuilder.buildFace(direction, blockRenData, relativePos, 1);

            const textureCords = texturePos[direction];

            blockRenData.pushData({ textureCords });
          }

          break;
        }
        case BlockShape.Flat: {
          // TODO get extra data rendering working
          // const extraBlockData = this.chunkMesh.getBlockData(cube.pos);
          // if (!extraBlockData) return;
          // console.log(extraBlockData, cube.pos);
          // const imageRender = new ImageRenderer(
          //   cube.pos,
          //   extraBlockData.face,
          // );

          // this.otherRenders.push(imageRender);
          break;
        }
        case BlockShape.X: {
          const texturePos = TextureMapper.getXTextureCores(cube.type);
          ShapeBuilder.buildX(blockRenData, relativePos);

          blockRenData.pushData({
            textureCords: [...texturePos[0], ...texturePos[1]],
          });
          break;
        }

        default: {
          throw new Error("Block type not renderable");
        }
      }
    });

    this.setBuffers(renData, transRenData);
  }
}
