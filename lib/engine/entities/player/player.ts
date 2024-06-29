import { Entity, FaceLocater, IEntity } from "../entity.js";
import { arrayAdd, arrayScalarMul } from "../../utils.js";
import { IDim } from "../../types.js";
import { MovableEntity, MovableEntityDto } from "../moveableEntity.js";
import { CONFIG } from "../../config.js";
import { Direction, Vector3D } from "../../utils/vector.js";
import { CameraRay } from "../../camera.js";
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
  public length = 10;

  public itemActions: ((game: Game) => void)[] = [];

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
  jumpCount = 0;
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

  moveInDirections(world: World, delta: number) {
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

    if (this.moveDirections.length === 0) {
      return;
    }

    let moveForce = Vector3D.zero;
    for (const dir of this.moveDirections) {
      const vel = moveDirection(dir);
      moveForce = moveForce.add(vel);
    }

    // If we don't have a y comp then use the current one
    if (moveForce.get(1) === 0) {
      moveForce.set(1, this.vel.get(1));
    }

    const scaleFactor = delta > 100 ? 0 : delta / 16;
    moveForce = moveForce.scalarMultiply(scaleFactor);

    const newPos = world.tryMove(this, moveForce);
    console.log(
      "Move due to God",
      "Pos before: ",
      this.pos.data,
      "Pos after: ",
      newPos.data,
      "Move Vel: ",
      moveForce.data
    );
    this.pos = newPos;

    this.vel = moveForce;
  }

  jumpForce = 0;
  tryJump() {
    if (this.onGround) {
      this.jumpForce = CONFIG.player.jumpSpeed;
    }
  }

  setCreative(val: boolean) {
    console.log("Setting creative to", val);
    this.creative = val;
  }

  hurt(amount: number) {
    this.health.current -= amount;
  }

  groundDelta = 0.03;
  gravityForce = 0;
  gravity(world: World, delta: number) {
    if (this.creative) {
      return;
    }
    if (this.onGround) {
      return;
    }

    console.log("gravity");

    if (this.gravityForce > 0.9) return; // set a terminal velocity
    this.gravityForce += CONFIG.gravity;

    // Try to move the player with the current gravity force
    const realForce = (this.gravityForce * delta) / 16;
    const forceVec = new Vector3D([0, realForce, 0]);

    const yBefore = this.pos.get(1);
    const newPos = world.tryMove(this, forceVec);
    console.log(
      "Gravity trying move",
      "Pos before: ",
      this.pos.data,
      "Force: ",
      forceVec.data,
      "Pos after: ",
      newPos.data
    );
    const yAfter = newPos.get(1);

    if (Math.abs(yBefore - yAfter) > 0.01) {
      // apply gravity
      this.pos = newPos;
      return;
    }

    // We only need to run this after we move.
    console.log("Hit ground", yBefore, yAfter);
    this.gravityForce = 0;
    this.pos.set(1, yAfter + 0.01);
    this.jumpCount = 0;
  }

  update(world: World, delta: number) {
    this.gravity(world, delta);
    this.moveInDirections(world, delta);

    if (this.fire.count > 0 && !this.fire.holding) this.fire.count--;

    const moveDist = Math.abs(this.vel.get(0)) + Math.abs(this.vel.get(2));

    if (moveDist > 0) {
      this.distanceMoved += moveDist;
    } else {
      this.distanceMoved = 0;
    }

    this.baseUpdate(world, delta);

    if (this.pos.get(1) < -10) {
      this.pos.set(1, 30);
      this.vel.set(1, -0.1);
    }

    // Am I on the ground? (Only need to check if I have moved)
    const belowPos = this.pos.add(new Vector3D([0, -0.5, 0]));
    const intersectingPoss = world.getIntersectingBlocksWithEntity(
      belowPos,
      new Vector3D(this.dim)
    );
    if (intersectingPoss.length > 0) {
      // find the tallest pos and add one to it to find where I shoudl be
      const max = Math.max(...intersectingPoss.map((p) => p.get(1)));
      const smallDelta = 0.03;
      const newHeight = max + 1 + smallDelta;
      this.pos.set(1, newHeight);
      this.onGround = true;
      this.jumpCount = 0;
    } else {
      this.onGround = false;
    }
  }

  hit(_game: Game, _entity: Entity, where: FaceLocater) {
    this.vel.set(where.side, 0);
    if (where.side === 1 && where.dir === 0) {
      this.onGround = true;
      this.jumpCount = 0;
    }
  }

  // TODO get camera data from the player's rot
  doPrimaryAction(game: Game, camera: CameraRay) {
    const item = this.belt.selectedItem;

    console.log("Doing primary action", item);

    if (item === ThrowableItem.Fireball) {
      this.fireball(game);
    } else {
      this.placeBlock(game, camera, item);
    }
  }

  doSecondaryAction(game: Game, camera: CameraRay) {
    const lookingData = game.world.lookingAt(camera);
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
  placeBlock(game: Game, camera: CameraRay, blockType: BlockType) {
    const lookingData = game.world.lookingAt(camera);
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

    const vel = this.rotCart.scalarMultiply(-0.4).data as IDim;
    vel[1] = -vel[1];

    const pos = arrayAdd(
      arrayAdd(this.pos.data, arrayScalarMul(vel, 4)),
      [0.5, 2, 0.5]
    ) as IDim;
    const ball = new Projectile({
      uid: "fireball-" + Math.random().toString().slice(2),
      pos,
      vel,
    });
    ball.vel = new Vector3D(vel);

    game.addEntity(ball);

    this.fire.count = this.fire.coolDown;
  }
}
