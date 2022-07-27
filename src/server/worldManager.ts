import { DbWorldModel } from "./dbWorldModel.js";
import { ICreateWorldOptions, ISocketMessage, ISocketMessageType } from "@craft/engine";
import { ServerGame } from "./serverGame.js";
import Websocket from "ws";
import { SocketInterface } from "./app.js";

export class WorldManager {
  private worlds: Map<string, ServerGame> = new Map();
  private worldModel = new DbWorldModel();

  constructor() {
    SocketInterface.listenForConnection((ws: Websocket) => {
      SocketInterface.listenTo(ws, async (message: ISocketMessage) => {
        // console.log(message);
        if (message.type === ISocketMessageType.joinWorld) {
          const { worldId, myUid } = message.joinWorldPayload!;
          const world = await this.getWorld(worldId);
          if (!world) {
            return;
          }
          // this function sends a welcome message to the client
          world.addSocket(myUid, ws);
        } else if (message.type === ISocketMessageType.newWorld) {
          const payload = message.newWorldPayload!;
          const world = await this.createWorld(payload);
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
    const loadedWorldData = await this.worldModel.getWorld(worldId);

    if (!loadedWorldData) return null;

    // add the world to our local list
    const serverWorld = new ServerGame(
      this.worldModel,
      loadedWorldData,
    );

    this.worlds.set(
      worldId,
      serverWorld,
    );
    return serverWorld;
  }

  async getAllWorlds() {
    return this.worldModel.getAllWorlds();
  }

  async createWorld(createWorldOptions: ICreateWorldOptions): Promise<ServerGame> {
    console.log(createWorldOptions);
    const worldData = await this.worldModel.createWorld(createWorldOptions);

    const newWorld = new ServerGame(
      this.worldModel,
      worldData,
    );

    this.worlds.set(
      worldData.worldId,
      newWorld,
    );

    return newWorld;
  }
}