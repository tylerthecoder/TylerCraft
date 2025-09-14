import { Renderer, RenderData } from "./renderer";
import { Camera, getBlockData, Vector3D } from "@craft/engine";
import TextureMapper from "../services/texture-mapping-service";
import {
  BlockShape,
  BlockType,
  ChunkPos,
  Game,
  InnerChunkPos,
  WorldPos,
} from "@craft/rust-world";
import ShapeBuilder from "../services/shape-builder";
import { GameRenderer } from "./game-renderer";

export class ChunkRenderer extends Renderer {
  private otherRenders: Renderer[] = [];

  constructor(
    public gameRenderer: GameRenderer,
    public chunkId: bigint,
    public game: Game
  ) {
    super(gameRenderer);
    this.setActiveTexture(gameRenderer.textureAtlas);
    this.getBufferData();
  }

  get worldPos(): WorldPos {
    return this.chunkPos.to_world_pos();
  }

  get chunkPos(): ChunkPos {
    return ChunkPos.from_id(this.chunkId);
  }

  render(camera: Camera, trans?: boolean): void {
    // if (!this.isLoaded) return;
    this.setActiveTexture(this.gameRenderer.textureAtlas);

    this.renderObject(
      new Vector3D([this.worldPos.x, this.worldPos.y, this.worldPos.z]),
      camera,
      trans
    );

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

    const start = performance.now();
    const chunkMeshEntries = this.game.getChunkMeshByChunkId(
      BigInt(this.chunkId)
    );
    const end = performance.now();
    console.log(
      "Time taken to get chunk mesh",
      end - start,
      " ms",
      this.chunkPos,
      chunkMeshEntries
    );

    this.otherRenders = [];

    const renData = new RenderData();
    const transRenData = new RenderData(true);

    const start2 = performance.now();

    chunkMeshEntries.forEach(({ index, directions }) => {
      const cubeWorldPos = InnerChunkPos.make_from_chunk_index(
        index
      ).to_world_pos(this.chunkPos);

      const blockType = this.game.getBlockType(cubeWorldPos);
      const faces = directions.to_array();

      if (blockType === BlockType.Void) return;

      // const relativePos = cube.world_pos.sub(worldPosVec).data;
      const relativePos = [
        cubeWorldPos.x - this.worldPos.x,
        cubeWorldPos.y - this.worldPos.y,
        cubeWorldPos.z - this.worldPos.z,
      ];
      const blockData = getBlockData(blockType);
      const blockRenData = blockData.transparent ? transRenData : renData;

      // console.log(
      //   `Cube | Chunk: ${this.chunkPos} | World Pos: ${cubeWorldPos} | Block Type: ${blockType} | Faces: ${faces} | Relative Pos: ${relativePos}`
      // );

      switch (blockData.shape) {
        case BlockShape.Cube: {
          const texturePos = TextureMapper.getTextureCords(blockType);
          // loop through all the faces to get their cords
          for (const direction of faces) {
            ShapeBuilder.buildFace(direction, blockRenData, relativePos, 1);

            const textureCords = texturePos[direction];

            blockRenData.pushData({ textureCords });
          }

          break;
        }
        case BlockShape.Flat: {
          break;
        }
        case BlockShape.X: {
          const texturePos = TextureMapper.getXTextureCores(blockType);
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

    const end2 = performance.now();
    console.log("Time taken to render chunk", end2 - start2, " ms");

    this.setBuffers(renData, transRenData);
  }
}
