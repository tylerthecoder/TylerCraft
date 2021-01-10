import { DbWorldModel } from "./dbWorldModel";
import { ServerGame } from "./serverGame";
import { ISocketMessage, ISocketMessageType } from "../src/types";
import * as wSocket from "ws";
import { SocketInterface } from "./app";

export class WorldManager {
  private worlds: Map<string, ServerGame> = new Map();
  private worldModel = new DbWorldModel();

  constructor() {
    SocketInterface.listenForConnection((ws: wSocket) => {
      SocketInterface.listenTo(ws, async (message: ISocketMessage) => {
        // console.log(message);
        if (message.type === ISocketMessageType.joinWorld) {
          const { worldId, myUid } = message.joinWorldPayload!;
          const world = await this.getWorld(worldId);
          if (world) {
            // this function sends a welcome message to the client
            world.addSocket(myUid, ws);
          }
        } else if (message.type === ISocketMessageType.newWorld) {
          const payload = message.newWorldPayload!;
          const world = await this.createWorld();
          console.log("Create Id: ", world.gameId);
          world.addSocket(payload.myUid, ws);
        } else if (message.type === ISocketMessageType.saveWorld) {
          const payload = message.saveWorldPayload!
          const world = this.worlds.get(payload.worldId);
          if (!world) {
            console.log("That world doesn't exist", payload);
            return;
          }
          world.save();
        }
      })
    });
  }

  async getWorld(worldId: string): Promise<ServerGame | null> {
    const world = this.worlds.get(worldId);
    if (world) {
      return world;
    }

    // we don't have the world, time to fetch it
    const loadedWorld = await this.worldModel.getWorld(worldId);

    if (loadedWorld) {
      // add the world to our local list
      const world = new ServerGame(
        this.worldModel,
        loadedWorld.chunkReader,
        loadedWorld.data
      );
      this.worlds.set(
        worldId,
        world,
      );
      return world;
    }

    return null;
  }

  async getAllWorlds() {
    return this.worldModel.getAllWorlds();
  }

  async createWorld(): Promise<ServerGame> {
    const worldData = await this.worldModel.createWorld();
    const worldId = worldData.worldId;

    const newWorld = new ServerGame(
      this.worldModel,
      worldData.chunkReader,
    );
    newWorld.gameId = worldId;

    this.worlds.set(
      worldId,
      newWorld,
    );

    return newWorld;
  }
}