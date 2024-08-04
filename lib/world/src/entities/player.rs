use super::entity::{Entity, EntityAction, EntityId};
use crate::{
    block::{BlockData, BlockType},
    direction::Direction,
    geometry::rotation::SphericalRotation,
    positions::{ChunkPos, FineWorldPos, WorldPos},
    world::World,
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::wasm_bindgen;

// #[derive(Clone, Serialize, Deserialize)]
// #[wasm_bindgen]
// struct FineWorldPos {
//     x: f32,
//     y: f32,
//     z: f32,
// }
// impl FineWorldPos {
//     pub fn to_world_pos(&self) -> WorldPos {
//         WorldPos {
//             x: self.x.floor() as i32,
//             y: self.y.floor() as i32,
//             z: self.z.floor() as i32,
//         }
//     }
// }
//
// #[wasm_bindgen]
// #[derive(Debug, Serialize, Deserialize, PartialEq, Eq, Clone, Copy)]
// struct WorldPos {
//     x: i32,
//     y: i32,
//     z: i32,
// }
// Convert World pos to Fine World pos
// impl From<WorldPos> for FineWorldPos {
//     fn from(world_pos: WorldPos) -> Self {
//         FineWorldPos {
//             x: world_pos.x as f32,
//             y: world_pos.y as f32,
//             z: world_pos.z as f32,
//         }
//     }
// }
//
// impl From<FineWorldPos> for WorldPos {
//     fn from(fine_pos: FineWorldPos) -> Self {
//         WorldPos {
//             x: fine_pos.x.floor() as i32,
//             y: fine_pos.y.floor() as i32,
//             z: fine_pos.z.floor() as i32,
//         }
//     }
// }
//
// impl From<WorldPos> for ChunkPos {
//     fn from(world_pos: WorldPos) -> Self {
//         let x = if world_pos.x < 0 {
//             ((world_pos.x + 1) / CHUNK_WIDTH as i32) - 1
//         } else {
//             world_pos.x / CHUNK_WIDTH as i32
//         };
//
//         let y = if world_pos.z < 0 {
//             ((world_pos.z + 1) / CHUNK_WIDTH as i32) - 1
//         } else {
//             world_pos.z / CHUNK_WIDTH as i32
//         };
//
//         ChunkPos {
//             x: x as i16,
//             y: y as i16,
//         }
//     }
// }

#[wasm_bindgen]
#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, Copy)]
pub struct Velocity {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Velocity {
    pub fn zero() -> Velocity {
        Velocity {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        }
    }
}

impl std::ops::Add for Velocity {
    type Output = Velocity;

    fn add(self, other: Velocity) -> Velocity {
        Velocity {
            x: self.x + other.x,
            y: self.y + other.y,
            z: self.z + other.z,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq, Clone, Copy)]
// #[wasm_bindgen]
pub struct WorldBlock {
    pub block_type: BlockType,
    // #[wasm_bindgen(skip)]
    pub extra_data: BlockData,
    pub world_pos: WorldPos,
}

// convert spherical rot into Velocity
impl From<SphericalRotation> for Velocity {
    fn from(rot: SphericalRotation) -> Self {
        let x = rot.theta.sin() * rot.phi.cos();
        let y = rot.phi.sin();
        let z = rot.theta.cos() * rot.phi.cos();
        Velocity { x, y, z }
    }
}

struct Size3 {
    x: f32,
    y: f32,
    z: f32,
}

// #[wasm_bindgen]
pub struct Player {
    // config
    speed: f32,
    max_speed: f32,
    gravity: f32,

    uid: EntityId,

    pub pos: FineWorldPos,
    dim: Size3,
    rot: SphericalRotation,
    pub vel: Velocity,

    pub is_flying: bool,
    on_ground: bool,
    moving_directions: Vec<Direction>,
}

// #[wasm_bindgen]
impl Player {
    pub fn make(uid: EntityId) -> Player {
        Player {
            speed: 0.0,
            max_speed: 0.0,
            gravity: 0.0,
            uid,
            pos: FineWorldPos {
                x: 0.0,
                y: 0.0,
                z: 0.0,
            },
            dim: Size3 {
                x: 0.8,
                y: 1.8,
                z: 0.8,
            },
            rot: SphericalRotation::new(0.0, 0.0),
            vel: Velocity::zero(),
            is_flying: false,
            on_ground: false,
            moving_directions: Vec::new(),
        }
    }
}

// #[derive(Serialize, Deserialize)]
// enum EntityAction {
//     Jump,
//     PrimaryAction,
//     SecondaryAction,
//     Move(Vec<Direction>),
//     ToggleFly,
//     Rotate(SphericalRotation),
//     TP(FineWorldPos),
// }
//
//
// #[repr(u8)]
// #[derive(Serialize, Deserialize)]
// pub enum GameAction {
//     Entity(EntityId, EntityAction),
// }

// trait Item {
//     fn use_item(&self, ent: &impl Entity) -> GameDiff;
// }
//
// struct FireballItem {
//     current_cooldown: u8,
//     cooldown: u8,
// }
//
// impl Item for FireballItem {
//     fn use_item(&self, ent: &impl Entity) -> GameDiff {
//         let mut diff = GameDiff::empty();
//
//         if self.current_cooldown > 0 {
//             return diff;
//         }

// Do math
// const vel = this.rot.toCartesianCoords().scalarMultiply(-0.4);
// vel.set(1, -vel.get(1));
//
// const pos = this.pos
//   .add(vel.scalarMultiply(2))
//   .add(new Vector3D(this.dim).scalarMultiply(0.5));
//
//
// let fireball_entity = FireballEntity {
//     pos: FineWorldPos {},
//     vel: Velocity,
//     life: 100,
// };
//
// let firebox = Box::new(fireball_entity);
// diff.new_entities.push(firebox);

//         diff
//     }
// }
//
// struct BlockItem {
//     block_type: BlockType,
// }
//
// impl Item for BlockItem {
//     fn use_item(&self, ent: &impl Entity) -> GameDiff {
//         let mut diff = GameDiff::empty();
// Do math
// const vel = this.rot.toCartesianCoords().scalarMultiply(-0.4);
// vel.set(1, -vel.get(1));
//
// const pos = this.pos
//   .add(vel.scalarMultiply(2))
//   .add(new Vector3D(this.dim).scalarMultiply(0.5));
//
//
// let block_entity = WorldBlock {
//     pos: FineWorldPos {},
//     block_type: self.block_type,
// };
// diff.new_blocks.push(block_entity);
// diff
// const ray = this.getRay();
// const lookingData = game.world.lookingAt(ray);
// if (!lookingData) return;
// console.log("Looking at data", lookingData);
// const { cube } = lookingData;
// if (!cube) return;
//
// const newCubePos = lookingData.cube.pos.add(
//   Vector3D.fromDirection(lookingData.face)
// );
//
// const newCube = CubeHelpers.createCube(blockType, newCubePos);
//
// console.log("Placed Cube", newCube);
//
// game.placeBlock(newCube);
//     }
// }

// enum Item {
//     Block(BlockType),
//     Fireball,
// }

// #[wasm_bindgen]
// struct Belt {
//     selected_index: u8,
//     items: Vec<Item>,
// }

struct PlayerGravityScript {
    player: Player,
}

impl PlayerGravityScript {
    pub fn gravity_force(&self) -> Option<Velocity> {
        if self.player.is_flying {
            return None;
        }

        if self.player.on_ground {
            return None;
        }

        Some(Velocity {
            x: 0.0,
            y: self.player.gravity,
            z: 0.0,
        })
    }

    fn update(&mut self, world: &World) {
        let gravity_force = self.gravity_force();
        if let Some(gravity_force) = gravity_force {
            self.player.vel = gravity_force + self.player.vel;
        }

        // loop through scripts and update
    }
}

impl Player {
    fn move_in_direction(&mut self, directions: Vec<Direction>) {
        self.moving_directions = directions;
    }
}

impl Player {
    pub fn god_force(&self) -> Velocity {
        // add the current players roation to the direction
        let mut new_rot = self.rot;

        let dirs = self.moving_directions.clone();

        new_rot = dirs
            .into_iter()
            .fold(new_rot, |acc, direction| acc + direction.into());

        new_rot.into()
    }
}

impl Entity for Player {
    fn update(&mut self, world: &World) {}

    fn id(&self) -> u32 {
        self.uid
    }
}
