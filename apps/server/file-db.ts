import { IGameMetadata, ISerializedGame } from "@craft/engine";
import { IDbManager } from "./db";
import fs from "fs";

const DATA_DIR = process.env.DATA_DIR || "./game-data/";
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

export class FileDb implements IDbManager {
  getAllGameMetadata(): Promise<IGameMetadata[]> {
    const gameFiles = fs.readdirSync(DATA_DIR);
    return Promise.resolve(
      gameFiles.map((gameFile) => {
        const gameData = fs.readFileSync(`${DATA_DIR}/${gameFile}`, "utf-8");
        const game = JSON.parse(gameData);
        return {
          gameId: game.gameId,
          name: game.name,
        };
      })
    );
  }

  getGame(gameId: string): Promise<ISerializedGame | null> {
    const gamePath = `${DATA_DIR}/${gameId}.json`;

    if (!fs.existsSync(gamePath)) {
      return Promise.resolve(null);
    }

    const gameData = fs.readFileSync(gamePath, "utf-8");

    return Promise.resolve(JSON.parse(gameData));
  }

  async saveGame(game: ISerializedGame): Promise<void> {
    const gamePath = `${DATA_DIR}/${game.gameId}.json`;

    fs.writeFileSync(gamePath, JSON.stringify(game, null, 2));
  }

  async deleteGame(gameId: string): Promise<void> {
    fs.unlinkSync(`${DATA_DIR}/${gameId}.json`);
  }
}
