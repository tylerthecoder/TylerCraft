import { Game } from "../game.js";
import { GameStateDiff } from "../gameStateDiff.js";
import { World } from "../world/world.js";
import { Entity, EntityDto } from "./entity.js";
import { IEntityType } from "./entityType.js";
import { Player } from "./player/player.js";
import { Projectile } from "./projectile.js";

// Types that need to be updated
export const GameEntityClassMap = {
  [IEntityType.Player]: Player,
  [IEntityType.Projectile]: Projectile,
};

// Helper Types
type ValueOfClass<C extends GameEntityTypeOfClass> = C extends new (
  ...args: any[]
) => infer T
  ? T
  : never;
type Distribute<U> = U extends GameEntityTypeOfClass ? ValueOfClass<U> : never;

export type GameEntityDtoMap = {
  [key in keyof typeof GameEntityClassMap]: ValueOfClass<
    (typeof GameEntityClassMap)[key]
  > extends Entity<infer DTO>
    ? DTO
    : never;
};
export type GameEntityDto = GameEntityDtoMap[keyof GameEntityDtoMap];
export type GameEntityTypeOfClass =
  (typeof GameEntityClassMap)[keyof typeof GameEntityClassMap];
export type GameEntity = Distribute<GameEntityTypeOfClass>;
type GameEntityClassTypeLookup<T extends IEntityType> = ValueOfClass<
  (typeof GameEntityClassMap)[T]
>;

export interface ISerializedEntities {
  entities: GameEntityDto[];
}

export class EntityHolder {
  private entities: Map<string, Entity> = new Map(); // this includes players
  private players: Map<string, Player> = new Map();

  constructor(data?: ISerializedEntities) {
    if (data) {
      const entityMapData: [uid: string, entity: Entity][] = data.entities.map(
        (e) => [e.uid, this.createEntity(e)]
      );
      this.entities = new Map(entityMapData);

      const playersMapData: [uid: string, player: Player][] = Array.from(
        this.entities.values()
      )
        .filter((ent) => ent instanceof Player)
        .map((player) => [player.uid, player as Player]);
      this.players = new Map(playersMapData);
    }
  }

  //=======================
  // Getters
  //========================
  tryGet<T extends Entity>(uid: string): T | undefined {
    return this.entities.get(uid) as T | undefined;
  }

  get<T extends Entity>(id: string): T {
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

  createEntity<
    T extends EntityDto,
    S extends GameEntityClassTypeLookup<T["type"]>
  >(entity: T): S {
    console.log("Creating entity of type: ", entity.type);
    const entClass = GameEntityClassMap[entity.type];
    return new entClass(entity) as S;
  }

  //=======================
  // Update
  //========================

  update(game: Game, world: World, delta: number) {
    const entityArray = Array.from(this.entities.values());
    entityArray.forEach((entity) => entity.update(game, world, delta));
  }

  updateEntity<T extends EntityDto>(entityDto: Partial<T> & { uid: string }) {
    const entity = this.entities.get(entityDto.uid);
    if (!entity) return;
    entity.set(entityDto as any);
  }

  setEntity(stateDiff: GameStateDiff, entityDto: EntityDto) {
    const entity = this.createEntity(entityDto);
    this.entities.set(entity.uid, entity);
    stateDiff.updateEntity(entity.uid);
  }

  serialize(): ISerializedEntities {
    return {
      entities: Array.from(this.players.values()).map((p) => p.getDto()),
    };
  }

  add(entity: Entity) {
    console.log("Adding entity: ", entity.uid);
    if (this.entities.has(entity.uid)) {
      throw new Error(`Entity ${entity.uid} already exists`);
    }
    if (!entity.uid) throw new Error("Must have uid");
    this.entities.set(entity.uid, entity);
  }

  createPlayer(uid: string) {
    console.log("Creating player: ", uid);
    if (this.players.has(uid)) {
      throw new Error(`Player ${uid} already exists`);
    }
    const player = Player.create(uid);
    this.players.set(player.uid, player);
    this.add(player);
    return player;
  }

  createOrGetPlayer(uid: string): Player {
    // looking to see if we have already loaded this player, if so then return it
    const player = this.players.get(uid);
    if (player) {
      return player;
    }

    return this.createPlayer(uid);
  }

  remove(uid: string) {
    const entity = this.entities.get(uid);
    if (!entity) {
      console.log("Can't find entity with that uid");
      return;
    }
    // if (entity instanceof Player)
    this.entities.delete(entity.uid);
  }

  removePlayer(uid: string) {
    const player = this.players.get(uid);
    if (!player) {
      console.log("Can't find player with that uid");
      return;
    }
    this.players.delete(player.uid);
    this.entities.delete(player.uid);
  }

  removeAllPlayers() {
    this.players.clear();
    this.entities.forEach((entity) => {
      if (entity instanceof Player) {
        this.entities.delete(entity.uid);
      }
    });
  }

  iterable() {
    return this.entities.values();
  }
}
