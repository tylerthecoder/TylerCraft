import { Cube } from "../entities/cube";
import { deserializeCube, ISerializedCube, serializeCube } from "../serializer";
import { Vector3D } from "../utils/vector";

export type ISerializedBlockerHolder = ISerializedCube[]

export class BlockHolder {
  private blocks: Map<string, Cube> = new Map();

  serialize(): ISerializedBlockerHolder {
    const blockData: ISerializedCube[] = [];
    for (const [pos, cube] of this.blocks.entries()) {
      blockData.push(serializeCube(cube, pos));
    }
    return blockData;
  }

  static deserialize(blockData: ISerializedBlockerHolder): BlockHolder {
    const blockHolder = new BlockHolder();

    blockHolder.blocks = new Map(
      blockData.map(data => {
        return [
          data[0],
          deserializeCube(data)
        ];
      })
    );

    return blockHolder;
  }

  private convertWorldPosToRelativePos(worldPos: Vector3D): Vector3D {
    // const x = worldPos.get(0);
    const adjustedX = ((worldPos.get(0) % 16) + 16) % 16;
    const adjustedZ = ((worldPos.get(2) % 16) + 16) % 16;
    return new Vector3D([adjustedX, worldPos.get(1), adjustedZ]);
  }

  get(worldPos: Vector3D): Cube | null {
    const relPos = this.convertWorldPosToRelativePos(worldPos);
    const cube = this.blocks.get(relPos.toIndex());
    if (!cube) return null;
    return cube;
  }

  add(cube: Cube): void {
    const relPos = this.convertWorldPosToRelativePos(cube.pos);
    this.blocks.set(relPos.toIndex(), cube);
  }

  remove(worldPos: Vector3D): void {
    const relPos = this.convertWorldPosToRelativePos(worldPos);
    this.blocks.delete(relPos.toIndex());
  }

  iterate(predicate: (cube: Cube) => void): void {
    for (const cube of this.blocks.values()) {
      predicate(cube);
    }
  }

  has(worldPos: Vector3D): boolean {
    const relPos = this.convertWorldPosToRelativePos(worldPos);
    return this.blocks.has(relPos.toIndex());
  }
}