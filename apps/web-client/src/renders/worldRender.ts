import {
  World,
  Entity,
  CONFIG,
  Camera,
  Player,
  Projectile,
  Vector2D,
  Vector3D,
  Chunk,
} from "@craft/engine";
import { Renderer } from "./renderer";
import { canvas } from "../canvas";
import { ChunkRenderer } from "./chunkRender";
import { HudRenderer } from "./hudRender";
import { ClientGame } from "../clientGame";
import { SphereRenderer } from "./sphereRender";
import { PlayerRenderer } from "./playerRender";
import { BlockType } from "@craft/rust-world";

export default class WorldRenderer {
  private renderers: Renderer[] = [];
  private entityRenderers: Map<string, Renderer> = new Map();
  private chunkRenderers: Map<string, ChunkRenderer> = new Map();
  shouldRenderMainPlayer = true;

  constructor(private world: World, game: ClientGame) {
    const hudCanvas = new HudRenderer(canvas, game);
    this.renderers.push(hudCanvas);
  }

  blockUpdate(chunkId: string) {
    console.log("Rerendering chunk", chunkId);
    const chunkPos = World.chunkIdToChunkPos(chunkId);
    const chunkMesh = this.world.getChunkMesh(chunkPos);
    const chunkRenderer = new ChunkRenderer(chunkMesh, chunkPos);
    chunkRenderer.getBufferData();
    this.chunkRenderers.set(chunkId, chunkRenderer);
  }

  getFilter(camera: Camera): Vector3D | null {
    const shiftedDown = camera.pos.sub(new Vector3D([0, 0.5, 0]));
    const block = this.world.getBlockFromWorldPoint(shiftedDown);

    if (block?.type === BlockType.Water) {
      return new Vector3D([0, 0.3, 1]);
    } else {
      return Vector3D.zero;
    }
  }

  /**
   * Map the entity to its renderer.
   * @param entity The entity to render
   */
  addEntity(entity: Entity) {
    if (entity instanceof Player) {
      const renderer = new PlayerRenderer(entity);
      this.entityRenderers.set(entity.uid, renderer);
    } else if (entity instanceof Projectile) {
      const renderer = new SphereRenderer(entity);
      this.entityRenderers.set(entity.uid, renderer);
    }
  }

  addChunk(chunk: Chunk) {
    this.blockUpdate(chunk.pos.toIndex());
  }

  removeEntity(uid: string) {
    this.entityRenderers.delete(uid);
  }

  renderChunk(
    chunkPos: Vector2D,
    camera: Camera,
    renderedSet: Set<ChunkRenderer>
  ) {
    const chunk = this.world.getChunkFromPos(chunkPos);

    if (!chunk) {
      return;
    }

    const chunkRenderer = this.chunkRenderers.get(chunkPos.toIndex());

    if (!chunkRenderer) {
      return;
    }

    renderedSet.add(chunkRenderer);

    chunkRenderer.render(camera);
  }

  render(game: ClientGame) {
    const camera = game.camera;

    const filter = this.getFilter(camera);
    if (filter) {
      canvas.setColorFilter(filter);
    }

    const renderedChunks = new Set<ChunkRenderer>();

    for (const renderer of this.renderers) {
      renderer.render(camera);
    }

    for (const entityRenderer of this.entityRenderers.values()) {
      // Skip rendering the player if we aren't supposed to
      if (
        entityRenderer instanceof PlayerRenderer &&
        entityRenderer.player === game.mainPlayer &&
        !this.shouldRenderMainPlayer
      ) {
        continue;
      }
      entityRenderer.render(camera);
    }

    // loop through all of the chunks that I would be able to see.
    const cameraXYPos = new Vector2D([camera.pos.get(0), camera.pos.get(2)]);

    const realRenderDistance = CONFIG.terrain.chunkSize * CONFIG.renderDistance;
    const cameraChunkPos = World.worldPosToChunkPos(camera.pos);

    const cameraRotNorm = camera.rot.toCartesianCoords().normalize();

    // this will hold the coords of ever chunk that was rendered.
    const renderedSet = new Set<string>();

    const skippedChunkPos = new Set<Vector2D>();

    for (let i = -CONFIG.renderDistance; i <= CONFIG.renderDistance; i++) {
      for (let j = -CONFIG.renderDistance; j <= CONFIG.renderDistance; j++) {
        const indexVec = new Vector2D([i, j]);
        const chunkPos = cameraChunkPos.add(indexVec);
        const chunkWorldPos = World.chunkPosToWorldPos(chunkPos, true);
        const chunkXYPos = new Vector2D([
          chunkWorldPos.get(0),
          chunkWorldPos.get(2),
        ]);
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

        renderedSet.add(chunkPos.toIndex());

        this.renderChunk(chunkPos, camera, renderedChunks);
      }
    }

    for (const chunkPos of skippedChunkPos.values()) {
      // check to see if any of the neighboring chunks were rendered
      // this is slightly inefficient but it makes sure the user sees all chunks.
      // since we are checking to see if the user can see the middle of the chunk we miss some chunks
      // that the user sees the edge of. This fixes that
      let stillShouldntRender = true;
      for (let k = -1; k <= 1; k += 1) {
        for (let l = -1; l <= 1; l += 1) {
          const indexVec = new Vector2D([k, l]);
          const chunkPosToCheck = chunkPos.add(indexVec);
          if (renderedSet.has(chunkPosToCheck.toIndex())) {
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
        if (!renderedSet.has(chunkPos.toIndex()))
          this.renderChunk(chunkPos, camera, renderedChunks);
      }
    }

    // loop through all the chunk renders and only render the transparent things
    // This is last so that the transparent things are rendered on top of the solid things
    for (const chunkRenderer of renderedChunks.values()) {
      chunkRenderer.render(camera, true);
    }
  }
}
