import { Entity, FaceLocater, IEntity } from "../entity.js";
import { arrayAdd, arrayScalarMul } from "../../utils.js";
import { IDim } from "../../types.js";
import { MovableEntity, MovableEntityDto } from "../moveableEntity.js";
import { CONFIG } from "../../config.js";
import { Direction, Vector3D } from "../../utils/vector.js";
<<<<<<< Updated upstream
import { ExtraBlockData } from "../../blockdata.js";
=======
>>>>>>> Stashed changes
import { CameraRay } from "../../camera.js";
import CubeHelpers from "../cube.js";
import { Game } from "../../game.js";
import { IEntityType } from "../entityType.js";
<<<<<<< Updated upstream
import { BlockType } from "@craft/rust-world";
=======
import { BlockMetaData, BlockShape, BlockType } from "@craft/rust-world";
>>>>>>> Stashed changes

export interface BeltDto {
  selectedBlock: BlockType | PlayerItem;
}

export enum PlayerItem {
  Fireball = "fireball",
}

class Belt {
  public selectedIndex = 0;
  public length = 10;

  public itemActions: ((game: Game) => void)[] = [];

  public items = [
    BlockType.Stone,
    BlockType.Gold,
    BlockType.Grass,
    BlockType.Wood,
    BlockType.RedFlower,
    BlockType.Cloud,
    BlockType.Leaf,
    PlayerItem.Fireball,
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

  moveInDirections() {
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

    let newVel = Vector3D.zero;
    for (const dir of this.moveDirections) {
      const vel = moveDirection(dir);
      newVel = newVel.add(vel);
    }

    // If we don't have a y comp then use the current one
    if (newVel.get(1) === 0) {
      newVel.set(1, this.vel.get(1));
    }

    this.vel = newVel;
  }

  tryJump() {
    if (this.onGround) {
      this.vel.set(1, CONFIG.player.jumpSpeed);
    }
  }

  setCreative(val: boolean) {
    console.log("Setting creative to", val);
    this.creative = val;
    this.gravitable = !val;
  }

  hurt(amount: number) {
    this.health.current -= amount;
  }

  update(delta: number) {
    this.moveInDirections();

    this.onGround = false;
    if (this.fire.count > 0 && !this.fire.holding) this.fire.count--;

    const moveDist = Math.abs(this.vel.get(0)) + Math.abs(this.vel.get(2));

    if (moveDist > 0) {
      this.distanceMoved += moveDist;
    } else {
      this.distanceMoved = 0;
    }

    this.baseUpdate(delta);

    if (this.pos.get(1) < -10) {
      this.pos.set(1, 30);
      this.vel.set(1, -0.1);
    }
  }

  hit(_entity: Entity, where: FaceLocater) {
    this.vel.set(where.side, 0);
    if (where.side === 1 && where.dir === 0) {
      this.onGround = true;
      this.jumpCount = 0;
    }
  }

  // TODO get camera data from the player's rot
  doPrimaryAction(game: Game, camera: CameraRay) {
    const item = this.belt.selectedItem;

    if (item === PlayerItem.Fireball) {
      this.fireball();
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

  fireball() {
    if (this.fire.count > 0) return;

    const vel = this.rotCart.scalarMultiply(-0.4).data as IDim;
    const pos = arrayAdd(
      arrayAdd(this.pos.data, arrayScalarMul(vel, 4)),
      [0.5, 2, 0.5]
    ) as IDim;
    // const ball = new Projectile(new Vector3D(pos), new Vector3D(vel));

    // this.actions.push({
    //   type: IActionType.addEntity,
    //   payload: {
    //     ent: ball.serialize(IEntityType.Projectile),
    //   }
    // });

    this.fire.count = this.fire.coolDown;
  }
}
