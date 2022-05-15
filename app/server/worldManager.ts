import { DbWorldModel } from "./dbWorldModel";
import { ServerGame } from "./serverGame";
import { ICreateWorldOptions, ISocketMessage, ISocketMessageType } from "../src/types";
import * as wSocket from "ws";
import { Game } from "../src/game";
import { SocketInterface } from "./app";

export class WorldManager {
  private worlds: Map<string, Game> = new Map();
  private worldModel = new DbWorldModel();

  constructor() {
    SocketInterface.listenForConnection((ws: wSocket) => {
      SocketInterface.listenTo(ws, async (message: ISocketMessage) => {
        // console.log(message);
        if (message.type === ISocketMessageType.joinWorld) {
          const { worldId, myUid } = message.joinWorldPayload!;
          const world = await this.getWorld(worldId);
          const serverGame = world?.gameScript as ServerGame;
          if (!serverGame) {
            return;
          }
          // this function sends a welcome message to the client
          serverGame.addSocket(myUid, ws);
        } else if (message.type === ISocketMessageType.newWorld) {
          const payload = message.newWorldPayload!;
          const world = await this.createWorld(payload);
          const serverGame = world.gameScript as ServerGame;
          console.log("Create Id: ", world.gameId);
          serverGame.addSocket(payload.myUid, ws);
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

  async getWorld(worldId: string): Promise<Game | null> {
    const world = this.worlds.get(worldId);
    if (world) {
      return world;
    }

    // we don't have the world, time to fetch it
    const loadedWorldData = await this.worldModel.getWorld(worldId);

    if (!loadedWorldData) return null;

    // add the world to our local list
    const serverWorld = new Game(
      ServerGame,
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

  async createWorld(createWorldOptions: ICreateWorldOptions): Promise<Game> {
    console.log(createWorldOptions);
    const worldData = await this.worldModel.createWorld(createWorldOptions);

    const newWorld = new Game(
      ServerGame,
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