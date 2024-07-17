import {
  Camera,
  Entity,
  Game,
  Player,
  Projectile,
  Vector2D,
  Vector3D,
  World,
} from "@craft/engine";
import { XrCamera } from "../cameras/xrCamera";
import { EntityCamera } from "../cameras/entityCamera";
import { GameScript } from "@craft/engine/game-script";
import { BasicGScript } from "./basic-gscript";
import { WebGlGScript } from "./webgl-gscript";
import { Renderer } from "../renders/renderer";
import { ChunkRenderer } from "../renders/chunkRender";
import { BlockType } from "@craft/rust-world";
import { PlayerRenderer } from "../renders/playerRender";
import { SphereRenderer } from "../renders/sphereRender";

type Config = {
  renderDistance: number;
  fovFactor: number;
  chunkSize: number;
};

// This class should only read game and not write.
export class CanvasGameScript extends GameScript<Config> {
  name = "world-renderer";

  config = {
    renderDistance: 5,
    fovFactor: 0.5,
    chunkSize: 16,
  };

  private renderers: Renderer[] = [];
  private entityRenderers: Map<string, Renderer> = new Map();
  private chunkRenderers: Map<string, ChunkRenderer> = new Map();
  shouldRenderMainPlayer = false;

  isSpectating = false;
  camera: Camera;
  numOfBlocks = 10;
  totTime = 0;
  pastDeltas: number[] = [];

  mainPlayer: Player;

  constructor(
    game: Game,
    private webGlGScript: WebGlGScript,
    private basic: BasicGScript
  ) {
    super(game);

    console.log("Canvas Render Usecase", this);

    window.addEventListener("keydown", (e) => {
      this.handleKeyDown(e.key);
    });

    this.mainPlayer = this.basic.mainPlayer;

    console.log("Main player", this.mainPlayer);

    // Create renderers for initial entities
    for (const entity of game.entities.iterable()) {
      this.onNewEntity(entity);
    }

    // Create renderers for initial chunks
    for (const chunkId of game.world.getLoadedChunkIds()) {
      this.onChunkUpdate(chunkId);
    }

    this.isSpectating = false;
    this.camera = this.webGlGScript.isXr
      ? new XrCamera(this.mainPlayer)
      : new EntityCamera(this.mainPlayer);
  }

  getFilter(camera: Camera): Vector3D | null {
    const shiftedDown = camera.pos.sub(new Vector3D([0, 0.5, 0]));
    const block = this.game.world.getBlockFromWorldPoint(shiftedDown);

    if (block?.type === BlockType.Water) {
      return new Vector3D([0, 0.3, 1]);
    } else {
      return Vector3D.zero;
    }
  }

  setup(): void | Promise<void> {
    this.webGlGScript.loop(this.renderLoop.bind(this));
  }

  private handleKeyDown(key: string) {
    if (key === "v") {
      this.toggleThirdPerson();
    }
  }

  toggleThirdPerson() {
    if (this.camera instanceof EntityCamera) {
      this.shouldRenderMainPlayer = this.camera.togglePerspective();
    }
  }

  get frameRate() {
    this.pastDeltas = this.pastDeltas.slice(-100);
    const totTime = this.pastDeltas.reduce((acc, cur) => acc + cur, 0);
    const averageMs = totTime / Math.min(this.pastDeltas.length, 100);
    const fps = 1 / (averageMs / 1000);
    return fps;
  }

  renderLoop(time: number) {
    const delta = time - this.totTime;

    const camera = this.camera;

    const filter = this.getFilter(camera);
    if (filter) {
      this.webGlGScript.setColorFilter(filter);
    }

    const renderedChunks = new Set<ChunkRenderer>();

    for (const renderer of this.renderers) {
      renderer.render(camera);
    }

    for (const entityRenderer of this.entityRenderers.values()) {
      // Skip rendering the player if we aren't supposed to
      if (
        entityRenderer instanceof PlayerRenderer &&
        entityRenderer.player === this.basic.mainPlayer &&
        !this.shouldRenderMainPlayer
      ) {
        continue;
      }
      entityRenderer.render(camera);
    }

    // loop through all of the chunks that I would be able to see.
    const cameraXYPos = new Vector2D([camera.pos.get(0), camera.pos.get(2)]);

    const realRenderDistance =
      this.config.chunkSize * this.config.renderDistance;
    const cameraChunkPos = World.worldPosToChunkPos(camera.pos);

    const cameraRotNorm = camera.rot.toCartesianCoords().normalize();

    // this will hold the coords of ever chunk that was rendered.
    const renderedSet = new Set<string>();

    const skippedChunkPos = new Set<Vector2D>();

    for (
      let i = -this.config.renderDistance;
      i <= this.config.renderDistance;
      i++
    ) {
      for (
        let j = -this.config.renderDistance;
        j <= this.config.renderDistance;
        j++
      ) {
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

        if (dist > this.config.fovFactor) {
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

    this.pastDeltas.push(delta);
    this.totTime = time;
  }

  renderChunk(
    chunkPos: Vector2D,
    camera: Camera,
    renderedSet: Set<ChunkRenderer>
  ) {
    const chunkRenderer = this.chunkRenderers.get(chunkPos.toIndex());

    if (!chunkRenderer) {
      return;
    }

    renderedSet.add(chunkRenderer);

    chunkRenderer.render(camera);
  }

  onNewEntity(entity: Entity): void {
    console.log("CanvasGameScript: Adding entity", entity);
    if (entity instanceof Player) {
      const renderer = new PlayerRenderer(this.webGlGScript, entity);
      this.entityRenderers.set(entity.uid, renderer);
    } else if (entity instanceof Projectile) {
      const renderer = new SphereRenderer(this.webGlGScript, entity);
      this.entityRenderers.set(entity.uid, renderer);
    }
  }

  onRemovedEntity(entity: Entity): void {
    console.log("CanvasGameScript: Removing entity", entity);
    this.entityRenderers.delete(entity.uid);
  }

  onChunkUpdate(chunkId: string): void {
    console.log("CanvasGameScript: Chunk update", chunkId);
    const chunkPos = World.chunkIdToChunkPos(chunkId);
    const chunkMesh = this.game.world.getChunkMesh(chunkPos);
    const chunkRenderer = new ChunkRenderer(
      this.webGlGScript,
      chunkMesh,
      chunkPos
    );
    chunkRenderer.getBufferData();
    this.chunkRenderers.set(chunkId, chunkRenderer);
  }
}
