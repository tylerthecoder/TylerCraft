import { IAction } from "../../types";
import { Game } from "../game";
import { deserializeEntity, getEntityType } from "../serializer";
import { World } from "../world/world";
import { Entity, ISerializedEntity } from "./entity";
import { Player } from "./player";

export interface ISerializedEntities {
  entities: ISerializedEntity[],
}

export class EntityHolder {
  private entities: Map<string, Entity> = new Map(); // this includes players
  private players: Map<string, Player> = new Map();

  constructor(
    private game: Game,
    data?: ISerializedEntities,
  ) {
    if (data) {
      const entityMapData: [uid: string, entity: Entity][] = data.entities.
        map(e => [e.uid, deserializeEntity(e)]);
      this.entities = new Map(entityMapData);

      const playersMapData: [uid: string, player: Player][] = Array.from(this.entities.values()).
        filter(ent => ent instanceof Player).
        map(player => [player.uid, player as Player]);
      this.players = new Map(playersMapData);

    }
  }

  getActions() {
    const actions: IAction[] = [];
    for (const entity of this.entities.values()) {
      const entActions = entity.getActions();
      actions.push(...entActions);
    }
    return actions;
  }

  update(world: World, delta: number) {
    const entityArray = Array.from(this.entities.values());
    entityArray.forEach(entity => entity.update(delta));
    world.update(entityArray);
  }

  serialize(): ISerializedEntities {
    return {
      entities: Array.from(this.players.values()).map((p) => p.serialize(getEntityType(p)!)),
    }
  }

  add(entity: Entity) {
    if (!entity.uid) throw new Error("Must have uid");
    this.entities.set(entity.uid, entity);
    this.game.onNewEntity(entity);
  }

  createOrGetPlayer(real: boolean, uid: string): Player {
    // looking to see if we have already loaded this player, if so then return it
    const player = this.players.get(uid);
    if (player) {
      player.isReal = real;
      // send an event to the game
      this.game.onNewEntity(player);
      return player;
    }

    const newPlayer = new Player(real, uid);
    this.players.set(newPlayer.uid, newPlayer);
    this.add(newPlayer);
    return newPlayer;
  }

  remove(uid: string) {
    const entity = this.entities.get(uid);
    if (!entity) {
      console.log("Can't find entity with that uid");
      // throw new Error("That entity doesn't exist");
      return;
    }
    // you can't delete a player
    if (entity instanceof Player) {
      return;
    }
    // if (entity instanceof Player)
    this.entities.delete(entity.uid);
  }

  get(uid: string) {
    return this.entities.get(uid);
  }

  getActivePlayers() {
     return Array.from(this.players.values());
  }

  iterable() {
    return this.entities.values();
  }
}


