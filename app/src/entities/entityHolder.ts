import { Game } from "../game";
import { deserializeEntity, getEntityType } from "../serializer";
import { World } from "../world/world";
import { Entity, EntityDto } from "./entity";
import { Player } from "./player";
import { Projectile } from "./projectile";

export const enum IEntityType {
  Player = 0,
  Projectile = 1
}

// Types that need to be updated
export const GameEntityClassMap = {
  [IEntityType.Player]: Player,
  [IEntityType.Projectile]: Projectile,
}

// Helper Types
type ValueOfClass<C extends GameEntityClass> = C extends (new (...args: any[]) => infer T) ? T : never;
export type GameEntityDtoMap = {
  [key in keyof typeof GameEntityClassMap]: ValueOfClass<typeof GameEntityClassMap[key]> extends Entity<infer DTO> ? DTO : never;
}
export type GameEntityDto = GameEntityDtoMap[keyof GameEntityDtoMap];
export type GameEntityClass = typeof GameEntityClassMap[keyof typeof GameEntityClassMap];
type GameEntityClassTypeLookup<T extends IEntityType> = ValueOfClass<typeof GameEntityClassMap[T]>;



export interface ISerializedEntities {
  entities: GameEntityDto[],
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

  //=======================
  // Getters
  //========================
  tryGet<T extends GameEntityDto>(uid: string): T | undefined {
    return this.entities.get(uid) as T | undefined;
  }

  get<T extends GameEntityDto>(id: string): T {
    const ent = this.tryGet<T>(id);
    if (!ent) {
      throw new Error(`Entity ${id} not found`);
    }
    return ent;
  }

  getActivePlayers() {
    return Array.from(this.players.values());
  }


  //=======================
  //    Create
  //=======================

  createEntity<T extends EntityDto, S extends GameEntityClassTypeLookup<T['type']>>(entity: T): S {
    const entClass = GameEntityClassMap[entity.type];
    return new entClass(entity) as S;
  }

  //=======================
  // Update
  //========================

  update(world: World, delta: number) {
    const entityArray = Array.from(this.entities.values());
    entityArray.forEach(entity => entity.update(delta));
    world.update(entityArray);
  }

  setEntity(entityDto: GameEntityDto) {
    const entity = this.createEntity(entityDto);
    this.entities.set(entity.uid, entity);
    this.game.stateDiff.updateEntity(entity.uid);
  }

  serialize(): ISerializedEntities {
    return {
      entities: Array.from(this.players.values()).map((p) => p.getDto()),
    }
  }

  add(entity: Entity) {
    if (!entity.uid) throw new Error("Must have uid");
    this.entities.set(entity.uid, entity);
    this.game.stateDiff.addEntity(entity.uid);
  }

  createOrGetPlayer(uid: string): Player {
    // looking to see if we have already loaded this player, if so then return it
    const player = this.players.get(uid);
    if (player) {
      // send an event to the game
      this.game.stateDiff.addEntity(player.uid);
      return player;
    }

    const newPlayer = Player.create(uid);
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

  iterable() {
    return this.entities.values();
  }
}


