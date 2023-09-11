import { WorldModule } from "@craft/engine";
import { DBManager } from "./db";
import { startServer } from "./server";
import { GameService } from "./game-service";

const db = await DBManager.makeClient();
await WorldModule.load();
const gameService = new GameService(db);
startServer(gameService);
