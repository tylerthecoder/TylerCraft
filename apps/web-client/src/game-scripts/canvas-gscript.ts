import {
  Camera,
  GameScript,
  GameWrapper,
  makeCameraForPlayer,
  makeThirdPersonBackCamera,
  makeThirdPersonFrontCamera,
  makeXRCamera,
  Vector2D,
  Vector3D,
} from "@craft/engine";
import { WebGlGScript } from "./webgl-gscript";
import { Renderer } from "../renders/renderer";
import { ChunkRenderer } from "../renders/chunkRender";
import { BlockType, Entity, Fireball, Game, Player } from "@craft/rust-world";
import { PlayerRenderer } from "../renders/playerRender";
import { SphereRenderer } from "../renders/sphereRender";

type Config = {
  renderDistance: number;
  fovFactor: number;
};

export enum PlayerPerspective {
  FirstPerson,
  ThirdPersonBack,
  ThirdPersonFront,
}

const CHUNK_SIZE = 16;

const DEFAULT_CONFIG: Config = {
  renderDistance: 5,
  fovFactor: 0.5,
};

// This class should only read game and not write.
export class CanvasGameScript extends GameScript<Config> {
  // This is called by the rust side
  public name = "World Renderer";

  public config: Config = DEFAULT_CONFIG;

  private renderers: Renderer[] = [];
  private entityRenderers: Map<number, Renderer> = new Map();
  private chunkRenderers: Map<number, ChunkRenderer> = new Map();

  public perspective: PlayerPerspective = PlayerPerspective.FirstPerson;

  shouldRenderMainPlayer = false;

  isSpectating = false;
  numOfBlocks = 10;
  totTime = 0;
  pastDeltas: number[] = [];

  gameWrapper: GameWrapper = new GameWrapper(this.game);

  updatedChunks: Set<number> = new Set();
  updatedEntities: Set<number> = new Set();

  constructor(
    game: Game,
    private webGlGScript: WebGlGScript,
    private mainPlayerId: number
  ) {
    super(game);

    console.log("Canvas Render Usecase", this);

    window.addEventListener("keydown", (e) => {
      this.handleKeyDown(e.key);
    });

    // Create renderers for initial entities
    for (const entity of this.gameWrapper.game.entities.get_all_clone()) {
      this.onNewEntity(entity);
    }

    // Create renderers for initial chunks
    for (const chunkId of this.gameWrapper.getLoadedChunkIds()) {
      this.createChunkRender(chunkId);
    }

    this.isSpectating = false;
  }

  // This is called by the rust side
  getConfig(): Config {
    console.log("CanvasGameScript: getConfig", this.config);
    return this.config;
  }

  // This is called by the rust side
  setConfig(config: Config): void {
    this.config = { ...this.config, ...config };
    console.log("CanvasGameScript config updated:", this.config);
  }

  // This is called by the rust side when a chunk is updated
  onChunkUpdate(chunkId: number): void {
    console.log("CanvasGameScript: onChunkUpdate", chunkId);
    this.updatedChunks.add(chunkId);
  }

  // This is called by the rust side when an entity is updated
  onEntityUpdate(entityId: number): void {
    console.log("CanvasGameScript: onEntityUpdate", entityId);
    this.updatedEntities.add(entityId);
  }

  getCamera(): Camera {
    const player = this.gameWrapper.getPlayer(this.mainPlayerId);
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

  update() {
    for (const entityId of this.updatedEntities) {
      console.log("CanvasGameScript: Updating entity", entityId);
      const entity =
        this.gameWrapper.game.entities.get_entity_by_id_clone(entityId);
      if (!entity) {
        console.log("CanvasGameScript: Entity not found", entityId);
        this.onRemovedEntity(entityId);
        continue;
      }
      this.onNewEntity(entity);
    }

    for (const chunkId of this.updatedChunks) {
      this.createChunkRender(chunkId);
    }

    this.updatedChunks.clear();
    this.updatedEntities.clear();
  }

  getFilter(camera: Camera): Vector3D {
    const shiftedDown = camera.pos.sub(new Vector3D([0, 0.5, 0]));
    const block = this.gameWrapper.getBlock(shiftedDown);

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
        entityRenderer.entityId === this.mainPlayerId &&
        !shouldRenderMainPlayer
      ) {
        continue;
      }
      entityRenderer.render(camera);
    }

    // loop through all of the chunks that I would be able to see.
    const cameraXYPos = new Vector2D([camera.pos.get(0), camera.pos.get(2)]);

    const realRenderDistance = CHUNK_SIZE * this.config.renderDistance;
    const cameraChunkPos = this.gameWrapper.getChunkPosFromWorldPos(camera.pos);

    // const cameraRotNorm = camera.rot.toCartesianCoords().normalize();

    const renderChunk = (chunkPos: Vector2D) => {
      const chunkId = this.gameWrapper.getChunkIdFromChunkPos(chunkPos);
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
        const chunkWorldPos =
          this.gameWrapper.getWorldPosFromChunkPos(chunkPos);
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

  onNewEntity(entity: Entity): void {
    console.log("CanvasGameScript: Adding entity", entity);
    // if (entity instanceof PlayerWrapper) {
    if (Player.is_player(entity)) {
      console.log("CanvasGameScript: Adding player");
      const renderer = new PlayerRenderer(
        this.game,
        this.webGlGScript,
        entity.id
      );
      this.entityRenderers.set(entity.id, renderer);
    } else if (Fireball.is_fireball(entity)) {
      console.log("CanvasGameScript: Adding fireball");
      const renderer = new SphereRenderer(
        this.game,
        this.webGlGScript,
        entity.id
      );
      this.entityRenderers.set(entity.id, renderer);
    }
  }

  onRemovedEntity(entityId: number): void {
    console.log("CanvasGameScript: Removing entity", entityId);
    this.entityRenderers.delete(entityId);
  }

  createChunkRender(chunkId: number): void {
    console.log("CanvasGameScript: Creating chunk render", chunkId);
    const chunkPos = this.gameWrapper.getChunkPosFromChunkId(chunkId);
    const chunkMesh = this.gameWrapper.getChunkMeshFromChunkPos(chunkId);
    const chunkRenderer = new ChunkRenderer(
      this.webGlGScript,
      chunkPos,
      chunkMesh
    );
    chunkRenderer.getBufferData();
    this.chunkRenderers.set(chunkId, chunkRenderer);
  }
}
