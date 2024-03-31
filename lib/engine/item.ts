import { BlockType } from "@craft/rust-world";

export enum ThrowableItem {
  Fireball = "fireball",
}

export type Item = BlockType | ThrowableItem;
