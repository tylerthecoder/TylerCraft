import { IEntity } from "../entity.js";
import { IDim } from "../../types.js";
import { MovableEntity, MovableEntityDto } from "../moveableEntity.js";
import { CONFIG } from "../../config.js";
import { Direction, Vector3D } from "../../utils/vector.js";
import CubeHelpers from "../cube.js";
import { Game } from "../../game.js";
import { IEntityType } from "../entityType.js";
import { BlockType } from "@craft/rust-world";
import { Item, ThrowableItem } from "../../item.js";
import { Projectile } from "../projectile.js";
import { PlayerAction } from "./playerActions.js";
import { World } from "../../world/index.js";

export interface BeltDto {
  selectedBlock: Item;
}

class Belt {
  public selectedIndex = 0;
  public items: Item[] = [
    BlockType.Stone,
    BlockType.Gold,
    BlockType.Grass,
    BlockType.Wood,
    BlockType.RedFlower,
    BlockType.Cloud,
    BlockType.Red,
    BlockType.Planks,
    BlockType.Leaf,
    ThrowableItem.Fireball,
  ];

  get selectedItem() {
    return this.items[this.selectedIndex];
  }

  getDto(): BeltDto {
    return {
      selectedBlock: this.selectedItem,
    };
  }

  public getItem(index: number) {
    const val = this.items[index];
    if (val) {
      return val;
    }
    return null;
  }

  public moveLeft() {
    this.selectedIndex =
      (this.selectedIndex - 1 + this.items.length) % this.items.length;
    console.log("Moved left", this.selectedIndex);
  }

  public moveRight() {
    this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
    console.log("Moved right", this.selectedIndex);
  }

  public setIndex(index: number) {
    this.selectedIndex = index;
    console.log("Set index", this.selectedIndex);
  }
}

export interface PlayerDto extends MovableEntityDto {
  type: IEntityType.Player;
  moveDirections: Direction[];
  rot: IDim;
  belt: BeltDto;
  health: {
    current: number;
    max: number;
  };
}

// A controller / PlayerHandler will append actions to Player
export class Player extends MovableEntity<PlayerDto> implements IEntity {
  // abstract values
  static readonly type = IEntityType.Player;
  get type() {
    return Player.type;
  }

  // Entity overrides
  pos: Vector3D = new Vector3D([0, 50, 0]);
  dim: IDim = [0.8, 2, 0.8];
  rot = new Vector3D([0, 0, Math.PI / 2]);

  // Player Member Variables
  thirdPerson = false;
  onGround = false;
  distanceMoved = 0; // used for animating the arms and legs. Reset to zero when not moving

  belt = new Belt();

  leftHandPosition = new Vector3D([1, 1, 0]);
  rightHandPosition = new Vector3D([1, 1, 1]);

  health = {
    current: 100,
    max: 100,
  };

  fire = {
    count: 0,
    holding: false,
    coolDown: 10,
  };

  creative = false;

  moveDirections: Direction[] = [];

  inventoryIndex = 0;

  static create(id: string): Player {
    return new Player({
      uid: id,
    });
  }

  getDto(): PlayerDto {
    return {
      ...this.baseDto(),
      type: IEntityType.Player,
      health: this.health,
      rot: this.rot.data as IDim,
      moveDirections: this.moveDirections,
      belt: this.belt.getDto(),
    };
  }

  set(player: Partial<PlayerDto>) {
    super.baseSet(player);
    if (player.health) {
      this.health = player.health;
    }
    if (player.moveDirections) {
      this.moveDirections = player.moveDirections;
    }
    if (player.rot) {
      this.rot = new Vector3D(player.rot);
    }
  }

  isJumping = false;
  haveDoubleJump = false;
  jumpCount = 0;
  tryJump() {
    if (this.onGround) {
      this.isJumping = true;
      return;
    }
    if (!this.haveDoubleJump) {
      this.isJumping = true;
      this.haveDoubleJump = true;
    }
  }

  setCreative(val: boolean) {
    console.log("Setting creative to", val);
    this.creative = val;
  }

  hurt(amount: number) {
    this.health.current -= amount;
  }

  godForce(): Vector3D | null {
    const baseSpeed = CONFIG.player.speed;

    const moveDirection = (direction: Direction) => {
      switch (direction) {
        case Direction.Forwards:
          return new Vector3D([-baseSpeed, this.rot.get(1), Math.PI / 2])
            .toCartesianCoords()
            .set(1, 0);
        case Direction.Backwards:
          return new Vector3D([baseSpeed, this.rot.get(1), Math.PI / 2])
            .toCartesianCoords()
            .set(1, 0);
        case Direction.Left:
          return new Vector3D([
            baseSpeed,
            this.rot.get(1) + Math.PI / 2,
            Math.PI / 2,
          ])
            .toCartesianCoords()
            .set(1, 0);
        case Direction.Right:
          return new Vector3D([
            baseSpeed,
            this.rot.get(1) - Math.PI / 2,
            Math.PI / 2,
          ])
            .toCartesianCoords()
            .set(1, 0);
        case Direction.Up:
          if (this.creative) {
            return new Vector3D([0, baseSpeed, 0]);
          } else {
            return Vector3D.zero;
          }
        case Direction.Down:
          if (this.creative) {
            return new Vector3D([0, -baseSpeed, 0]);
          } else {
            return Vector3D.zero;
          }
      }
    };

    let desiredVel = Vector3D.zero;
    if (this.creative) {
      desiredVel.set(1, 0);
    } else {
      desiredVel.set(1, this.vel.get(1));
    }
    for (const dir of this.moveDirections) {
      const vel = moveDirection(dir);
      desiredVel = desiredVel.add(vel);
    }
    const currentVel = this.vel;

    let force = desiredVel.sub(currentVel);

    if (force.magnitude() > 0.025) {
      force = force.normalize().scalarMultiply(0.025);
    }

    return force;
  }

  jumpForce(): Vector3D | null {
    if (this.creative) {
      return null;
    }
    if (!this.isJumping) {
      return null;
    }
    this.isJumping = false;

    const diffYVel = CONFIG.player.jumpSpeed - this.vel.get(1);
    return new Vector3D([0, diffYVel, 0]);
  }

  gravityForce(): Vector3D | null {
    if (this.creative) {
      return null;
    }
    if (this.onGround) {
      return null;
    }
    return new Vector3D([0, CONFIG.gravity, 0]);
  }

  update(_game: Game, world: World, delta: number) {
    const jumpForce = this.jumpForce();
    const gravityForce = this.gravityForce();
    const godForce = this.godForce();

    const totalForce = (
      [godForce, jumpForce, gravityForce].filter((f) => f) as Vector3D[]
    ).reduce((acc: Vector3D, f: Vector3D) => acc.add(f), Vector3D.zero);

    this.vel = this.vel.add(totalForce);

    // We did move
    if (this.vel.magnitude() > 0) {
      const scaledVel = this.vel.scalarMultiply(delta / 16);
      const newPos = world.tryMove(this, scaledVel);
      const actualVel = newPos.sub(this.pos);
      this.pos = newPos;

      const moveDist = Math.abs(actualVel.get(0)) + Math.abs(actualVel.get(2));
      if (moveDist > 0) {
        this.distanceMoved += moveDist;
      } else {
        this.distanceMoved = 0;
      }
    } else {
      this.distanceMoved = 0;
    }

    // set terminal velocity
    // if (this.vel.get(1) < -0.9) {
    //   this.vel.set(1, -0.9);
    // }

    if (this.fire.count > 0 && !this.fire.holding) this.fire.count--;

    // Am I on the ground? (Only need to check if I have moved)
    const belowPos = this.pos.add(new Vector3D([0, -0.1, 0]));
    const intersectingPoss = world.getIntersectingBlocksWithEntity(
      belowPos,
      new Vector3D(this.dim)
    );

    if (intersectingPoss.length > 0) {
      this.vel.set(1, 0);
      this.onGround = true;
      this.isJumping = false;
      this.haveDoubleJump = false;
    } else {
      this.onGround = false;
    }
  }

  doPrimaryAction(game: Game) {
    const item = this.belt.selectedItem;

    console.log("Doing primary action", item);

    if (item === ThrowableItem.Fireball) {
      this.fireball(game);
    } else {
      this.placeBlock(game, item);
    }
  }

  doSecondaryAction(game: Game) {
    const ray = this.getRay();
    const lookingData = game.world.lookingAt(ray);
    if (!lookingData) return;
    const { cube } = lookingData;
    if (!cube) return;
    game.removeBlock(cube);
  }

  private actionListeners: ((action: PlayerAction) => void)[] = [];
  addActionListener(listener: (action: PlayerAction) => void) {
    this.actionListeners.push(listener);
  }

  // Right now this just send the action, the handling happens in playerAction.ts
  handleAction(action: PlayerAction) {
    console.log("Handling actionin palyer", action);
    for (const listener of this.actionListeners) {
      console.log("Calling listener");
      listener(action);
    }
  }

  // Player actions
  placeBlock(game: Game, blockType: BlockType) {
    const ray = this.getRay();
    const lookingData = game.world.lookingAt(ray);
    if (!lookingData) return;
    console.log("Looking at data", lookingData);
    const { cube } = lookingData;
    if (!cube) return;

    const newCubePos = lookingData.cube.pos.add(
      Vector3D.fromDirection(lookingData.face)
    );

    const newCube = CubeHelpers.createCube(blockType, newCubePos);

    console.log("Placed Cube", newCube);

    game.placeBlock(newCube);
  }

  fireball(game: Game) {
    if (this.fire.count > 0) return;

    const vel = this.rot.toCartesianCoords().scalarMultiply(-0.4);
    vel.set(1, -vel.get(1));

    const pos = this.pos
      .add(vel.scalarMultiply(2))
      .add(new Vector3D(this.dim).scalarMultiply(0.5));

    console.log("Firing fireball", this, pos, vel);

    const ball = new Projectile({
      uid: "fireball-" + Math.random().toString().slice(2),
      pos: pos.data as IDim,
      vel: vel.data as IDim,
    });
    ball.vel = vel;

    game.addEntity(ball);

    this.fire.count = this.fire.coolDown;
  }
}
