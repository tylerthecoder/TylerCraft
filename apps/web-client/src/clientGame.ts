import { Camera, Game, Player, GameStateDiff } from "@craft/engine";
import { EntityCamera } from "./cameras/entityCamera";
import { canvas } from "./canvas";
import WorldRenderer from "./renders/worldRender";
import { XrCamera } from "./cameras/xrCamera";

// This class should only read game and not write.
// It uses game data to draw the game to the screen and handle user input
export class CanvasRenderUsecase {
  worldRenderer: WorldRenderer;
  isSpectating = false;
  camera: Camera;
  numOfBlocks = 10;
  totTime = 0;
  pastDeltas: number[] = [];

  constructor(public game: Game, public mainPlayer: Player) {
    console.log("Canvas Render Usecase", this);

    game.addUpdateListener(this.update.bind(this));

    this.worldRenderer = new WorldRenderer(game.world, this);
    this.worldRenderer.shouldRenderMainPlayer = false;

    // Create renderers for initial entities
    for (const entity of game.entities.iterable()) {
      console.log("Adding entity in game", entity);
      this.worldRenderer.addEntity(entity);
    }

    // Create renderers for initial chunks
    for (const chunk of game.world.getChunks()) {
      this.worldRenderer.addChunk(chunk);
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
      const entity = this.game.entities.get(entityId);
      this.worldRenderer.addEntity(entity);
    }

    for (const entityId of stateDiff.getRemovedEntities()) {
      this.worldRenderer.removeEntity(entityId);
    }

    const loadedChunk = this.game.world.chunks.getNewlyLoadedChunk();
    if (loadedChunk) {
      this.worldRenderer.addChunk(loadedChunk);
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
