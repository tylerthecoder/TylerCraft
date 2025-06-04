import { GameWrapper } from "@craft/engine";
import { CanvasGameScript } from "./game-scripts/canvas-gscript";
import { WebGlGScript } from "./game-scripts/webgl-gscript";
import { MobileController } from "./controllers/playerControllers/mobileController";
import { KeyboardPlayerEntityController } from "./controllers/playerControllers/keyboardPlayerController";
import { getMyUid, IS_MOBILE } from "./utils";
import {
  Chunk,
  EntityActionDto,
  SandBoxGScript,
  TerrainGenerator,
  WasmRequestChunk,
} from "@craft/rust-world";
import { ClientDbGamesService } from "./services/sp-games-service";
import { HudGScript } from "./game-scripts/hudRender";

export class SinglePlayerTerrainChunkGetter {
  public terrianGen: TerrainGenerator;
  private chunks_to_insert: [{ x: number; y: number }, Chunk][] = [];
  private fetched_chunks: [{ x: number; y: number }][] = [];

  constructor(private game: GameWrapper) {
    this.terrianGen = new TerrainGenerator(0, false, false);
  }

  getChunk(chunkPos: { x: number; y: number }) {
    const existingChunk = this.chunks_to_insert.find(
      (c) => c[0].x === chunkPos.x && c[0].y === chunkPos.y
    );
    const existingFetchedChunk = this.fetched_chunks.find(
      (c) => c[0].x === chunkPos.x && c[0].y === chunkPos.y
    );
    if (existingChunk || existingFetchedChunk) {
      console.log("Chunk already exists in chunks_to_insert or fetched_chunks");
      return;
    }
    console.log("Getting chunk", chunkPos);
    const chunk = this.terrianGen.get_chunk(chunkPos.x, chunkPos.y);
    this.chunks_to_insert.push([chunkPos, chunk]);
    return chunk;
  }

  update() {
    for (const chunk of this.chunks_to_insert) {
      this.game.game.schedule_chunk_insert_wasm(chunk[1]);
      this.fetched_chunks.push([chunk[0]]);
    }
    this.chunks_to_insert = [];
  }

  getWasmRequestChunk() {
    return new WasmRequestChunk(this.getChunk.bind(this));
  }
}

export const spGameService = await ClientDbGamesService.factory();

export const DEFAULT_CONFIG = {
  loadDistance: 2,
  renderDistance: 10,
  fovFactor: 0.5,
  chunkSize: 16,
  seed: 0,
  flatWorld: true,
};

export async function run(id?: string) {
  console.log("Starting game", id);

  const game = id ? await spGameService.getGame(id) : spGameService.newGame();

  console.log("Game", game);

  (window as any).game = game;

  if (!game) {
    console.error("Game not found");
    return;
  }

  const chunkGetter = new SinglePlayerTerrainChunkGetter(game);

  // add sandbox
  const sandbox = new SandBoxGScript(2, chunkGetter.getWasmRequestChunk());
  const serializedSandbox = sandbox.serialize();
  game.game.add_sandbox_wasm(sandbox);

  const main_player_uid = getMyUid();

  game.makeAndAddPlayer(main_player_uid);
  game.game.update();

  const ents = game.game.entities.get_all_clone();
  console.log("Ents", ents);

  const webglGameScript = new WebGlGScript(game.game);

  const canvasGameScript = new CanvasGameScript(
    game.game,
    webglGameScript,
    main_player_uid,
    {
      renderDistance: 10,
      fovFactor: 0.5,
      chunkSize: 16,
    }
  );

  game.makeAndAddGameScript(canvasGameScript);

  const hudRender = new HudGScript(
    game.game,
    canvasGameScript,
    main_player_uid
  );

  const onAction = (action: EntityActionDto) => {
    game.game.handle_action_wasm(action);
  };

  const playerController = (() => {
    if (IS_MOBILE) {
      return new MobileController(onAction, main_player_uid);
    } else {
      return new KeyboardPlayerEntityController(
        game.game,
        onAction,
        () => {
          spGameService.saveGame(
            game,
            chunkGetter.terrianGen,
            serializedSandbox
          );
        },
        main_player_uid,
        canvasGameScript
      );
    }
  })();

  async function task() {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const update = async () => {
    const start = performance.now();
    game.game.handle_actions();
    game.game.run_scripts();
    await task();
    game.game.add_new_entities();
    await task();
    game.game.remove_entities();
    await task();
    game.game.add_single_chunk();
    await task();
    game.game.add_blocks();
    await task();
    game.game.remove_blocks();
    await task();
    chunkGetter.update();
    await task();
    playerController.update();
    await task();
    canvasGameScript.update();
    await task();
    hudRender.update(0);
    await task();
    canvasGameScript.renderLoop(0);
    const end = performance.now();
    if (end - start > 50) {
      console.log("Large update happened. Time: ", end - start);
    }
    requestAnimationFrame(update);
  };

  requestAnimationFrame(update);

  // setInterval(async () => {
  //   console.log("Saving game");
  //   await spGameService.saveGame(
  //     game,
  //     chunkGetter.terrianGen,
  //     serializedSandbox
  //   );
  // }, 3000);

  canvasGameScript.renderLoop(0);
}
