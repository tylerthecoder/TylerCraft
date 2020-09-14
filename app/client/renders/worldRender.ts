import { World } from "../../src/world/world";
import { Renderer } from "./renderer";
import { canvas } from "../canvas";
import { ChunkRenderer } from "./chunkRender";
import { HudRenderer } from "./hudRender";
import { CubeRenderer } from "./cubeRender";
import { ClientGame } from "../clientGame";
import { Entity, RenderType } from "../../src/entities/entity";
import { SphereRenderer } from "./sphereRender";
import { CONFIG } from "../../src/constants";
import { Vector2D, Vector3D } from "../../src/utils/vector";
import { Camera } from "../cameras/camera";
import { Cube } from "../../src/entities/cube";
import { Player } from "../../src/entities/player";
import { Projectile } from "../../src/entities/projectile";
import { Ball } from "../../src/entities/ball";

export default class WorldRenderer {
  private renderers: Renderer[] = [];
  private entityRenderers: Map<string, Renderer> = new Map();
  private chunkRenderers: Map<string, ChunkRenderer> = new Map();
  shouldRenderMainPlayer = false;


  constructor(
    private world: World,
    game: ClientGame,
  ) {
    const hudCanvas = new HudRenderer(canvas, game);
    this.renderers.push(hudCanvas);
  }

  blockUpdate(chunkId: string) {
    const chunkToUpdate = this.chunkRenderers.get(chunkId);
    if (chunkToUpdate) chunkToUpdate.getBufferData(this.world);
  }

  addEntity(entity: Entity) {
    if (
      entity instanceof Cube ||
      entity instanceof Player ||
      entity instanceof Projectile
    ) {
      const renderer = new CubeRenderer(entity);
      this.entityRenderers.set(entity.uid, renderer);
    } else if (
      entity instanceof Ball
    ) {
      const renderer = new SphereRenderer(entity);
      this.entityRenderers.set(entity.uid, renderer);
    }
  }

  removeEntity(uid: string) {
    this.entityRenderers.delete(uid);
  }

  renderChunk(chunkPos: Vector2D, camera: Camera, renderedSet: Set<ChunkRenderer>) {
    const chunk = this.world.getChunkFromPos(chunkPos, {loadIfNotFound: true});

    if (!chunk) {
      // console.log("Chunk not found, loading");
      return;
    }

    let chunkRenderer = this.chunkRenderers.get(chunkPos.toString());

    // this is a new chunk we haven't seen yet
    if (!chunkRenderer) {

      // not ideal but it is what needs to be done to make sure that the visible faces are rendered correctly
      // maybe put on another thread later.
      this.blockUpdate(chunkPos.add(new Vector2D([0,1])).toString());
      this.blockUpdate(chunkPos.add(new Vector2D([1,0])).toString());
      this.blockUpdate(chunkPos.add(new Vector2D([0,-1])).toString());
      this.blockUpdate(chunkPos.add(new Vector2D([-1,0])).toString());

      chunkRenderer = new ChunkRenderer(chunk, this.world);
      this.chunkRenderers.set(chunkPos.toString(), chunkRenderer);
    }

    renderedSet.add(chunkRenderer);

    chunkRenderer.render(camera);
  }

  render(game: ClientGame) {
    canvas.clearCanvas();
    const camera = game.camera;


    const renderedChunks = new Set<ChunkRenderer>();


    for (const renderer of this.renderers) {
      renderer.render(camera);
    }

    for (const entityRenderer of this.entityRenderers.values()) {
      if (entityRenderer instanceof CubeRenderer) {
        const isMainPlayer = entityRenderer.entity === game.mainPlayer;

        if (isMainPlayer && !this.shouldRenderMainPlayer) {
          continue;
        }
      }
      entityRenderer.render(camera);
    }

    // loop through all of the chunks that I would be able to see.
    const cameraXYPos = new Vector2D([
      camera.pos.get(0),
      camera.pos.get(2),
    ]);

    const realRenderDistance = CONFIG.terrain.chunkSize * CONFIG.renderDistance;
    const cameraChunkPos = this.world.worldPosToChunkPos(camera.pos);

    const cameraRotNorm = camera.rotCart.normalize();

    // this will hold the coords of ever chunk that was rendered.
    const renderedSet = new Set<string>();

    const skippedChunkPos = new Set<Vector2D>();

    for (let i = - CONFIG.renderDistance; i <= CONFIG.renderDistance; i++) {
      for (let j = - CONFIG.renderDistance; j <= CONFIG.renderDistance; j++) {
        const indexVec = new Vector2D([i, j]);
        const chunkPos = cameraChunkPos.add(indexVec);
        const chunkWorldPos = this.world.chunkPosToWorldPos(chunkPos, true);
        const chunkXYPos = new Vector2D([chunkWorldPos.get(0), chunkWorldPos.get(2)]);
        const distAway = cameraXYPos.distFrom(chunkXYPos);

        if (distAway > realRenderDistance) {
          // don't render this chunk because it is outside of the player's view
          continue;
        }

        // check if you are facing that right way to see the chunk
        const diffChunkCamera = camera.pos.sub(chunkWorldPos).normalize();
        const dist = diffChunkCamera.distFrom(cameraRotNorm);

        if (dist > CONFIG.fovFactor) {
          // don't render this chunk because the player isn't looking at it
          skippedChunkPos.add(chunkPos);
          continue;
        }

        renderedSet.add(chunkPos.toString());

        this.renderChunk(chunkPos, camera, renderedChunks);
      }
    }

    for (const chunkPos of skippedChunkPos.values()) {
      // check to see if any of the neighboring chunks were rendered
      // this is slightly inefficent but it makes sure the user sees all chunks.
      // since we are checking to see if the user can see the middle of the chunk we miss some chunks
      // that the user sees the edge of. This fixes that
      let stillShouldntRender = true;
      for (let k = -1; k <= 1; k += 1) {
        for (let l = -1; l <= 1; l += 1) {
          const indexVec = new Vector2D([k, l]);
          const chunkPosToCheck = chunkPos.add(indexVec);
          if (renderedSet.has(chunkPosToCheck.toString())) {
            stillShouldntRender = false;
          }
        }
      }

      if (!stillShouldntRender) {
        this.renderChunk(chunkPos, camera, renderedChunks);
      }
    }

    // This is for when you are looking directly at the ground.
    // Since I only check when the user can't see the center of a chunk, if you are looking directly at the ground you can't
    // see the chunk. Thus this renders the 9 chunks below you.
    for (let k = -1; k <= 1; k += 1) {
      for (let l = -1; l <= 1; l += 1) {
        const indexVec = new Vector2D([k, l]);
        const chunkPos = cameraChunkPos.add(indexVec);
        if (!renderedSet.has(chunkPos.toString()))
          this.renderChunk(chunkPos, camera, renderedChunks);
      }
    }


    // loop through all the chunk renders and only render the transparent things
    for (const chunkRenderer of renderedChunks.values()) {
      chunkRenderer.render(camera, true);
    }

  }


}