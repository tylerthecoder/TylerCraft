import { Renderer, RenderData } from "./renderer";
import { Camera } from "../../src/camera";
import { Chunk } from "../../src/world/chunk";
import { arraySub } from "../../src/utils";
import TextureMapper from "../textureMapper";
import { Cube } from "../../src/entities/cube";
import { Vector3D } from "../../src/utils/vector";
import { World } from "../../src/world/world";
import { BLOCK_DATA, BlockType, getBlockData } from "../../src/blockdata";
import TextureService from "../services/textureService";
import { ImageRenderer } from "./imageRender";
import ShapeBuilder from "../services/shapeBuilder";
import { faceVectorToFaceNumber } from "../../src/utils/face";


type IVisibleFaceMap = Map<string, { cube: Cube, faceVectors: Vector3D[] }>;

export class ChunkRenderer extends Renderer {

  private isLoaded = false;

  private otherRenders: Renderer[] = [];

  constructor(public chunk: Chunk, world: World) {
    super();
    this.setActiveTexture(TextureService.textureAtlas);
    this.getBufferData(world);

    // this.otherRenders.push(
    //   new ImageRenderer(
    //     chunk.pos.add(new Vector3D([2, 2, 2])),
    //     0
    //   )
    // );

    // const chunkRendererWorker = new ChunkRendererWorker();

    // // get the surrounding chunks
    // const surroundingChunks = Vector2D.edgeVectors
    //   .map((dir) => world.getChunkFromPos(chunk.chunkPos.add(dir)))
    //   .filter(chunk => Boolean(chunk))
    //   .map(chunk => chunk?.serialize()) as ISerializedChunk[];

    // chunkRendererWorker.postMessage({
    //   chunk: chunk.serialize(),
    //   surroundingChunks,
    // });

    // chunkRendererWorker.onmessage = (message: MessageEvent<IWorkerResponse>) => {
    //   console.log(message);
    //   const { positions, indices, textureCords, transIndices, transPositions, transTextureCords } = message.data;
    //   this.isLoaded = true;
    //   this.setBuffersData(positions, indices, textureCords, transPositions, transIndices, transTextureCords)
    // }

    // this.getBufferData(world);

  }

  render(camera: Camera, trans?: boolean): void {
    // if (!this.isLoaded) return;
    this.setActiveTexture(TextureService.textureAtlas);

    this.renderObject(this.chunk.pos.data, camera, trans);

    this.otherRenders.forEach(r => {
      r.render(camera)
    });
  }

  // return if there is a cube (or void) at this position
  private isCube(pos: Vector3D, world: World, currentCube: Cube) {

    // This is outside of the world, so we don't have to show this face
    if (pos.get(1) < 0) return true;

    const cube = world.getBlockFromWorldPoint(pos);
    if (cube === null) return false;


    const blockData = BLOCK_DATA.get(cube.type)!;
    const currentCubeBlockData = BLOCK_DATA.get(currentCube.type)!;

    if (blockData.blockType === BlockType.fluid && currentCubeBlockData.blockType === BlockType.fluid) {
      return true;
    }

    if (blockData.transparent) {
      return false;
    }

    return true;
  }

  private addVisibleFace(faceMap: IVisibleFaceMap, cube: Cube, directionVector: Vector3D) {
    let visibleCubePos = faceMap.get(cube.pos.toIndex());
    if (!visibleCubePos) {
      visibleCubePos = {
        cube: cube,
        faceVectors: []
      }
    }
    visibleCubePos.faceVectors.push(directionVector);
    faceMap.set(cube.pos.toIndex(), visibleCubePos);
  }

  private getDataForBlock(
    renData: RenderData,
    cube: Cube,
    world: World,
    visibleFaceMap: IVisibleFaceMap
  ): void {
    const blockData = getBlockData(cube.type);

    // If they are flat then they are an image, thus we need to add them to otherRenderers
    if (blockData.blockType === BlockType.flat) {
      const extraBlockData = this.chunk.blocks.getBlockData(cube.pos);
      console.log(extraBlockData, cube.pos);
      const imageRender = new ImageRenderer(
        cube.pos,
        extraBlockData.face,
      );

      this.otherRenders.push(imageRender);

      return;
    }

    const relativePos = arraySub(cube.pos.data, this.chunk.pos.data);
    const texturePos = TextureMapper.getTextureCords(cube.type);

    if (blockData.blockType === BlockType.cube || blockData.blockType === BlockType.fluid) {

      // loop through all the faces to get their cords
      for (const face of [0, 1, 2, 3, 4, 5]) {
        // check to see if there is a cube touching me on this face
        const directionVector = Vector3D.unitVectors[face];
        const nearbyCube = this.isCube(cube.pos.add(directionVector), world, cube);
        // skkkkkip
        if (nearbyCube) {
          continue;
        }

        // add the face to the list of visible faces on the chunk
        this.addVisibleFace(visibleFaceMap, cube, directionVector);

        ShapeBuilder.buildFace(face, renData, relativePos, 1);

        const textureCords = texturePos[face];

        renData.pushData({ textureCords, });
      }

    } else if (blockData.blockType === BlockType.x) {
      ShapeBuilder.buildX(renData, relativePos);

      renData.pushData({
        textureCords: [...texturePos[0], ...texturePos[1]]
      });

      // make a flower still "hittable"
      for (const directionVector of Vector3D.unitVectors) {
        this.addVisibleFace(visibleFaceMap, cube, directionVector);
      }
    } else if (blockData.blockType === BlockType.flat) {
      // NO-OP
      throw new Error("Not a valid block type")
    } else {

      throw new Error("Not a valid block type")
    }

  }

  // have an options to launch this on a worker thread (maybe always have it on a different thread)
  /**
   * Gets the position of each of the vertices in this chunk and adds them to the buffer
   * @param world
   */
  getBufferData(world: World): void {
    this.chunk.calculateVisibleFaces(world);

    console.log("Getting Buffer Data");

    this.otherRenders = [];

    const renData = new RenderData();
    const transRenData = new RenderData(true);



    this.chunk.visibleCubesFaces.forEach((visibleFace) => {
      const { cube, faceVectors } = visibleFace;

      const relativePos = arraySub(cube.pos.data, this.chunk.pos.data);
      const blockData = getBlockData(cube.type);
      const blockRenData = blockData.transparent ? transRenData : renData;

      switch (blockData.blockType) {
        case BlockType.cube:
        case BlockType.fluid: {
          const texturePos = TextureMapper.getTextureCords(cube.type);
          // loop through all the faces to get their cords
          for (const directionVector of faceVectors) {
            // check to see if there is a cube touching me on this face
            const nearbyCube = this.isCube(cube.pos.add(directionVector), world, cube);
            // skkkkkip
            if (nearbyCube) continue;

            const faceIndex = faceVectorToFaceNumber(directionVector);

            ShapeBuilder.buildFace(faceIndex, blockRenData, relativePos, 1);

            const textureCords = texturePos[faceIndex];

            blockRenData.pushData({ textureCords, });
          }

          break;
        }
        case BlockType.flat: {
          const extraBlockData = this.chunk.blocks.getBlockData(cube.pos);
          console.log(extraBlockData, cube.pos);
          const imageRender = new ImageRenderer(
            cube.pos,
            extraBlockData.face,
          );

          this.otherRenders.push(imageRender);
          break;
        }
        case BlockType.x: {
          const texturePos = TextureMapper.getTextureCords(cube.type);
          ShapeBuilder.buildX(renData, relativePos);

          renData.pushData({
            textureCords: [...texturePos[0], ...texturePos[1]]
          });
          break;
        }

        default: {
          throw new Error("Block type not renderable")
        }
      }
    });



    // const renData = new RenderData();
    // const transRenData = new RenderData();

    // this.chunk.blocks.iterate(cube => {
    //   const blockData = getBlockData(cube.type);

    //   if (blockData.transparent) {
    //     this.getDataForBlock(transRenData, cube, world, visibleCubePosMap);
    //   } else {
    //     this.getDataForBlock(renData, cube, world, visibleCubePosMap);
    //   }
    // })

    // this.chunk.visibleCubesFaces = Array.from(visibleCubePosMap.values());
    console.log("Transparent Render Data", transRenData);
    this.setBuffers(renData, transRenData);
  }
}
