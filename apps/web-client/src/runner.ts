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
// import { eStartMenu } from "./elements";

class SinglePlayerTerrainChunkGetter {
  private chunks_to_insert: Chunk[] = [];
  public terrianGen: TerrainGenerator;

  constructor(private game: GameWrapper) {
    this.terrianGen = new TerrainGenerator(0, true, false);
  }

  getChunk(chunkPos: { x: number; y: number }) {
    const chunk = this.terrianGen.get_chunk(chunkPos.x, chunkPos.y);
    this.chunks_to_insert.push(chunk);
  }

  update() {
    for (const chunk of this.chunks_to_insert) {
      this.game.game.schedule_chunk_insert_wasm(chunk);
    }
    this.chunks_to_insert = [];
  }

  getWasmRequestChunk() {
    return new WasmRequestChunk(this.getChunk.bind(this));
  }
}

const spGameService = await ClientDbGamesService.factory();
export async function run(id?: string) {
  // Start the game
  console.log("RUNNING Starting game");

  // hideElement(eStartMenu);

  const game = id ? await spGameService.getGame(id) : spGameService.newGame();

  (window as any).game = game;

  if (!game) {
    console.error("Game not found");
    return;
  }

  const chunkGetter = new SinglePlayerTerrainChunkGetter(game);

  // add sandbox
  const sandbox = new SandBoxGScript(1, chunkGetter.getWasmRequestChunk());
  const serializedSandbox = sandbox.serialize();
  game.game.add_sandbox_wasm(sandbox);

  const main_player_uid = getMyUid();

  game.makeAndAddPlayer(main_player_uid);
  game.game.update();

  const ents = game.getEntities();
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
    console.log("ACTION", action);
    game.game.handle_action_wasm(action);
  };

  const playerController = (() => {
    if (IS_MOBILE) {
      return new MobileController(onAction, main_player_uid);
    } else {
      return new KeyboardPlayerEntityController(
        onAction,
        main_player_uid,
        canvasGameScript,
        webglGameScript
      );
    }
  })();

  const update = () => {
    game.game.update();
    playerController.update();
    canvasGameScript.update();
    hudRender.update(0);
    chunkGetter.update();
    canvasGameScript.renderLoop(0);
  };

  setInterval(update, 1000 / 60);

  // setInterval(async () => {
  //   console.log("Saving game");
  //   await spGameService.saveGame(
  //     game,
  //     chunkGetter.terrianGen,
  //     serializedSandbox
  //   );
  // }, 3000);

  console.log("Starting");

  console.log(canvasGameScript);

  canvasGameScript.renderLoop(0);
}

run("f27fa11d-bf9e-4f82-8a3e-9e87a02c3870");
