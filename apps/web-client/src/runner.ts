import { GameWrapper, PlayerActionService } from "@craft/engine";
import { CanvasGameScript } from "./game-scripts/canvas-gscript";
import { WebGlGScript } from "./game-scripts/webgl-gscript";
import { MobileController } from "./controllers/playerControllers/mobileController";
import { KeyboardPlayerEntityController } from "./controllers/playerControllers/keyboardPlayerController";
import { getMyUid, IS_MOBILE } from "./utils";
import {
  Chunk,
  SandBoxGScript,
  TerrainGenerator,
  WasmRequestChunk,
} from "@craft/rust-world";
import { ClientDbGamesService } from "./services/sp-games-service";
// import { eStartMenu } from "./elements";

class SinglePlayerTerrainChunkGetter {
  private chunks_to_insert: Chunk[] = [];
  public terrianGen: TerrainGenerator;

  constructor(private game: GameWrapper) {
    this.terrianGen = new TerrainGenerator(0, true, false);
  }

  getChunk(chunkPos: { x: number; y: number }) {
    console.log("REQUEST CHUNK", chunkPos);
    const chunk = this.terrianGen.get_chunk(chunkPos.x, chunkPos.y);
    console.log("CHUNK", chunk);
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
export function run() {
  // Start the game
  console.log("RUNNING Starting game");

  // hideElement(eStartMenu);

  const game = GameWrapper.makeGame();

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

  const playerActionService = new PlayerActionService(game);

  const webglGameScript = new WebGlGScript(game);

  const canvasGameScript = new CanvasGameScript(
    game,
    webglGameScript,
    main_player_uid
  );

  game.makeAndAddGameScript(canvasGameScript);

  const playerController = (() => {
    if (IS_MOBILE) {
      return new MobileController(playerActionService, game, main_player_uid);
    } else {
      return new KeyboardPlayerEntityController(
        playerActionService,
        game,
        main_player_uid,
        canvasGameScript,
        webglGameScript
      );
    }
  })();

  // make the camera

  const update = () => {
    game.game.update();
    playerController.update();
    canvasGameScript.update();
    chunkGetter.update();
    canvasGameScript.renderLoop(0);
  };

  setInterval(update, 1000 / 60);

  const saveGame = async () => {
    await spGameService.saveGame(
      game,
      chunkGetter.terrianGen,
      serializedSandbox
    );
  };

  setInterval(saveGame, 1000);

  console.log("Starting");

  console.log(canvasGameScript);

  canvasGameScript.renderLoop(0);
}

run();
