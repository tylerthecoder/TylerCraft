import { Camera, Game, Player } from "@craft/engine";
import WorldRenderer from "../renders/worldRender";
import { XrCamera } from "../cameras/xrCamera";
import { canvas } from "../canvas";
import { EntityCamera } from "../cameras/entityCamera";
import { IGameScript } from "@craft/engine/game-script";
import { BasicUsecase } from "../usecases/sandbox";

// This class should only read game and not write.
export class CanvasGameScript implements IGameScript {
  worldRenderer: WorldRenderer;
  isSpectating = false;
  camera: Camera;
  numOfBlocks = 10;
  totTime = 0;
  pastDeltas: number[] = [];

  mainPlayer: Player;

  constructor(public game: Game) {
    console.log("Canvas Render Usecase", this);

    this.worldRenderer = new WorldRenderer(game, game.world);
    this.worldRenderer.shouldRenderMainPlayer = false;

    this.mainPlayer = game.getGameScript(BasicUsecase).mainPlayer;

    // Create renderers for initial entities
    for (const entity of game.entities.iterable()) {
      console.log("Adding entity in game", entity);
      this.worldRenderer.addEntity(entity);
    }

    // Create renderers for initial chunks
    for (const chunkId of game.world.getLoadedChunkIds()) {
      this.worldRenderer.blockUpdate(chunkId);
    }

    this.isSpectating = false;
    this.camera = canvas.isXr
      ? new XrCamera(this.mainPlayer)
      : new EntityCamera(this.mainPlayer);

    canvas.loop(this.renderLoop.bind(this));
  }

  get frameRate() {
    this.pastDeltas = this.pastDeltas.slice(-100);
    const totTime = this.pastDeltas.reduce((acc, cur) => acc + cur, 0);
    const averageMs = totTime / Math.min(this.pastDeltas.length, 100);
    const fps = 1 / (averageMs / 1000);
    return fps;
  }

  update(_delta: number) {
    const stateDiff = this.game.stateDiff;

    for (const dirtyChunkId of stateDiff.getDirtyChunks()) {
      console.log("Dirty chunk, rerendering", dirtyChunkId);
      this.worldRenderer.blockUpdate(dirtyChunkId);
    }

    for (const entityId of stateDiff.getNewEntities()) {
      const entity = this.game.entities.tryGet(entityId);
      if (!entity) {
        console.warn("Entity not found", entityId);
        continue;
      }
      this.worldRenderer.addEntity(entity);
    }

    for (const entityId of stateDiff.getRemovedEntities()) {
      this.worldRenderer.removeEntity(entityId);
    }

    const newChunk = this.game.world.getNewlyLoadedChunkId();
    if (newChunk) {
      console.log("New chunk loaded", newChunk);
      this.worldRenderer.blockUpdate(newChunk);
    }
  }

  renderLoop(time: number) {
    const delta = time - this.totTime;
    this.worldRenderer.render();
    this.pastDeltas.push(delta);
    this.totTime = time;
  }

  toggleThirdPerson() {
    if (this.camera instanceof EntityCamera) {
      this.worldRenderer.shouldRenderMainPlayer =
        this.camera.togglePerspective();
    }
  }
}
