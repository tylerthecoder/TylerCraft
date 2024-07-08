import { Camera, Entity, Game, Player } from "@craft/engine";
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
      this.onNewEntity(entity);
    }

    // Create renderers for initial chunks
    for (const chunkId of game.world.getLoadedChunkIds()) {
      this.onChunkUpdate(chunkId);
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

  onNewEntity(entity: Entity): void {
    console.log("CanvasGameScript: Adding entity", entity);
    this.worldRenderer.addEntity(entity);
  }

  onRemovedEntity(entity: Entity): void {
    console.log("CanvasGameScript: Removing entity", entity);
    this.worldRenderer.removeEntity(entity.uid);
  }

  onChunkUpdate(chunkId: string): void {
    console.log("CanvasGameScript: Chunk update", chunkId);
    this.worldRenderer.blockUpdate(chunkId);
  }
}
