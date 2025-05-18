import {
  Camera,
  GameDiffWrapper,
  GameScript,
  GameWrapper,
  makeCameraForPlayer,
  makeThirdPersonBackCamera,
  makeThirdPersonFrontCamera,
  makeXRCamera,
  PlayerWrapper,
  Vector2D,
  Vector3D,
} from "@craft/engine";
import { WebGlGScript } from "./webgl-gscript";
import { Renderer } from "../renders/renderer";
import { ChunkRenderer } from "../renders/chunkRender";
import { BlockType } from "@craft/rust-world";
import { PlayerRenderer } from "../renders/playerRender";

type Config = {
  renderDistance: number;
  fovFactor: number;
  chunkSize: number;
};

export enum PlayerPerspective {
  FirstPerson,
  ThirdPersonBack,
  ThirdPersonFront,
}

// This class should only read game and not write.
export class CanvasGameScript extends GameScript<Config> {
  name = "world-renderer";

  config = {
    renderDistance: 5,
    fovFactor: 0.5,
    chunkSize: 16,
  };

  private renderers: Renderer[] = [];
  private entityRenderers: Map<number, Renderer> = new Map();
  private chunkRenderers: Map<number, ChunkRenderer> = new Map();

  public perspective: PlayerPerspective = PlayerPerspective.FirstPerson;

  shouldRenderMainPlayer = false;

  isSpectating = false;
  numOfBlocks = 10;
  totTime = 0;
  pastDeltas: number[] = [];

  constructor(
    game: GameWrapper,
    private webGlGScript: WebGlGScript,
    private mainPlayerId: number
  ) {
    super(game);

    console.log("Canvas Render Usecase", this);

    window.addEventListener("keydown", (e) => {
      this.handleKeyDown(e.key);
    });

    // Create renderers for initial entities
    for (const entity of this.game.getEntities()) {
      this.onNewEntity(entity);
    }

    // Create renderers for initial chunks
    for (const chunkId of this.game.getLoadedChunkIds()) {
      this.onChunkUpdate(chunkId);
    }

    this.isSpectating = false;
  }

  getCamera(): Camera {
    const player = this.game.getPlayer(this.mainPlayerId);
    if (this.webGlGScript.isXr) {
      return makeXRCamera(player);
    } else {
      if (this.perspective === PlayerPerspective.FirstPerson) {
        return makeCameraForPlayer(player);
      } else if (this.perspective === PlayerPerspective.ThirdPersonBack) {
        return makeThirdPersonBackCamera(player);
      } else {
        return makeThirdPersonFrontCamera(player);
      }
    }
  }

  private lastDiff: GameDiffWrapper | null = null;

  onDiff(diff: GameDiffWrapper) {
    this.lastDiff = diff;
  }

  update() {
    if (!this.lastDiff) {
      return;
    }

    for (const entityId of this.lastDiff.updated_entities) {
      const entity = this.game.getPlayer(entityId);
      this.onNewEntity(entity);
    }

    for (const chunkId of this.lastDiff.updated_chunks) {
      this.onChunkUpdate(chunkId);
    }
  }

  getFilter(camera: Camera): Vector3D {
    const shiftedDown = camera.pos.sub(new Vector3D([0, 0.5, 0]));
    const block = this.game.getBlock(shiftedDown);

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
      this.togglePerspective();
    }
  }

  public togglePerspective(): boolean {
    this.perspective =
      this.perspective === PlayerPerspective.FirstPerson
        ? PlayerPerspective.ThirdPersonBack
        : this.perspective === PlayerPerspective.ThirdPersonBack
          ? PlayerPerspective.ThirdPersonFront
          : PlayerPerspective.FirstPerson;

    return this.perspective !== PlayerPerspective.FirstPerson;
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

    const camera = this.getCamera();

    const shouldRenderMainPlayer =
      this.perspective !== PlayerPerspective.FirstPerson;

    const filter = this.getFilter(camera);
    if (filter) {
      this.webGlGScript.setColorFilter(filter);
    }

    const renderedChunks = new Set<ChunkRenderer>();
    // this will hold the coords of ever chunk that was rendered.
    const renderedSet = new Set<string>();

    for (const renderer of this.renderers) {
      renderer.render(camera);
    }

    for (const entityRenderer of this.entityRenderers.values()) {
      // Skip rendering the player if we aren't supposed to
      if (
        entityRenderer instanceof PlayerRenderer &&
        entityRenderer.player.uid === this.mainPlayerId &&
        !shouldRenderMainPlayer
      ) {
        continue;
      }
      // entityRenderer.render(camera);
    }

    // loop through all of the chunks that I would be able to see.
    const cameraXYPos = new Vector2D([camera.pos.get(0), camera.pos.get(2)]);

    const realRenderDistance =
      this.config.chunkSize * this.config.renderDistance;
    const cameraChunkPos = this.game.getChunkPosFromWorldPos(camera.pos);

    // const cameraRotNorm = camera.rot.toCartesianCoords().normalize();

    const renderChunk = (chunkPos: Vector2D) => {
      const chunkId = this.game.getChunkIdFromChunkPos(chunkPos);
      const chunkRenderer = this.chunkRenderers.get(chunkId);
      if (!chunkRenderer) {
        return;
      }
      renderedChunks.add(chunkRenderer);
      chunkRenderer.render(camera);
    };

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
        const chunkWorldPos = this.game.getWorldPosFromChunkPos(chunkPos);
        const chunkXYPos = new Vector2D([
          chunkWorldPos.get(0),
          chunkWorldPos.get(2),
        ]);
        const distAway = cameraXYPos.distFrom(chunkXYPos);

        if (distAway > realRenderDistance) {
          // don't render this chunk because it is outside of the player's view
          continue;
        }

        // DISABLED: idk if this actually works
        // check if you are facing that right way to see the chunk
        // const diffChunkCamera = camera.pos.sub(chunkWorldPos).normalize();
        // const dist = diffChunkCamera.distFrom(cameraRotNorm);

        // if (dist > this.config.fovFactor) {
        //   // don't render this chunk because the player isn't looking at it
        //   skippedChunkPos.add(chunkPos);
        //   continue;
        // }

        renderedSet.add(chunkPos.toIndex());

        renderChunk(chunkPos);
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
        renderChunk(chunkPos);
      }
    }

    // This is for when you are looking directly at the ground.
    // Since I only check when the user can't see the center of a chunk, if you are looking directly at the ground you can't
    // see the chunk. Thus this renders the 9 chunks below you.
    for (let k = -1; k <= 1; k += 1) {
      for (let l = -1; l <= 1; l += 1) {
        const indexVec = new Vector2D([k, l]);
        const chunkPos = cameraChunkPos.add(indexVec);
        if (!renderedSet.has(chunkPos.toIndex())) renderChunk(chunkPos);
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

  onNewEntity(entity: PlayerWrapper): void {
    console.log("CanvasGameScript: Adding entity", entity);
    // if (entity instanceof PlayerWrapper) {
    const renderer = new PlayerRenderer(this.webGlGScript, entity);
    this.entityRenderers.set(entity.uid, renderer);
    // } else if (entity instanceof Projectile) {
    //   const renderer = new SphereRenderer(this.webGlGScript, entity);
    //   this.entityRenderers.set(entity.uid, renderer);
    // }
  }

  onRemovedEntity(entity: PlayerWrapper): void {
    console.log("CanvasGameScript: Removing entity", entity);
    this.entityRenderers.delete(entity.uid);
  }

  onChunkUpdate(chunkId: number): void {
    const chunkPos = this.game.getChunkPosFromChunkId(chunkId);
    const chunkMesh = this.game.getChunkMeshFromChunkPos(chunkId);
    const chunkRenderer = new ChunkRenderer(
      this.webGlGScript,
      chunkPos,
      chunkMesh
    );
    chunkRenderer.getBufferData();
    this.chunkRenderers.set(chunkId, chunkRenderer);
    console.log(this.chunkRenderers);
  }
}
