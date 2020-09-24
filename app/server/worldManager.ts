import { ISerializedGame } from "../src/game";
import { DbWorldModel, RamChunkReader } from "./dbWorldModel";
import { ServerGame } from "./serverGame";
import {wss} from "./main";

export class WorldManager {
  private worlds: Map<string, ServerGame>;
  private worldModel = new DbWorldModel();


  async getWorld(worldId: string): Promise<ISerializedGame|null> {
    const world = this.worlds.get(worldId);
    if (world) {
      return world.serialize();
    }

    // we don't have the world, time to fetch it
    const loadedWorld = await this.worldModel.getWorld(worldId);

    if (loadedWorld) {
      // add the world to our local list
      this.worlds.set(
        worldId,
        new ServerGame(loadedWorld.chunkReader, wss, loadedWorld.data),
      );

      return loadedWorld.data;
    }

    return null;
  }

  createWorld(): string {
    const worldId:string = Math.random() + "";
    const newWorld = new ServerGame(new RamChunkReader(), wss);

    this.worlds.set(
      worldId,
      newWorld,
    );

    return worldId;
  }
}