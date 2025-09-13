use tsify::declare;
use wasm_bindgen::prelude::wasm_bindgen;

use crate::{
    chunk::{ChunkId, CHUNK_WIDTH},
    components::world_pos::WorldPos,
    entities::{entity_component::impl_component, game::Game},
    geometry::vec2::Vec2i16,
    utils::js_log,
    vec::{Vec3f32, Vec3u8, Vector3Ops},
};

#[cfg(test)]
mod unit_tests;

pub type InnerChunkPos = Vec3u8;
#[declare]
pub type ChunkPos = Vec2i16;

impl_component!(ChunkPos);
impl_component!(InnerChunkPos);

impl InnerChunkPos {
    pub fn to_chunk_index(&self) -> usize {
        let x_part = (self.x as usize) << (4 + 6);
        let y_part = (self.y as usize) << 4;
        let z_part = self.z as usize;
        x_part + y_part + z_part
    }

    pub fn make_from_chunk_index(index: usize) -> InnerChunkPos {
        let x_part = (index >> (4 + 6)) as i8;
        let y_part = ((index & 0b1111110000) >> 4) as i8;
        let z_part = (index & 0b1111) as i8;
        InnerChunkPos::new(x_part, y_part, z_part)
    }

    pub fn to_world_pos(&self, chunk_pos: &ChunkPos) -> WorldPos {
        let pos = chunk_pos.scalar_mul(CHUNK_WIDTH).move_to_3d(0).add(self);
        WorldPos::new(pos.x() as i32, pos.y() as i32, pos.z() as i32)
    }
}

#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(js_name = "chunkIndexToWorldPos")]
    pub fn chunk_index_to_world_pos(&self, index: usize, chunk_pos: &ChunkPos) -> WorldPos {
        InnerChunkPos::make_from_chunk_index(index).to_world_pos(chunk_pos)
    }

    #[wasm_bindgen(js_name = "chunkIdToWorldPos")]
    pub fn chunk_id_to_world_pos(&self, chunk_id: ChunkId) -> WorldPos {
        ChunkPos::from_id(chunk_id).to_world_pos()
    }

    #[wasm_bindgen(js_name = "chunkIdToChunkPos")]
    pub fn chunk_id_to_chunk_pos(&self, chunk_id: ChunkId) -> ChunkPos {
        ChunkPos::from_id(chunk_id)
    }
}

// impl WorldPos {

//     pub fn is_valid(&self) -> bool {
//         self.y >= 0 && self.y < 256
//     }

//     pub fn to_inner_chunk_pos(&self) -> InnerChunkPos {
//         let x = (((self.x as i8 % 16) + 16) % 16) as u8;
//         let y = self.y as u8;
//         let z = (((self.z as i8 % 16) + 16) % 16) as u8;
//         InnerChunkPos::new(x, y, z)
//     }

//     pub fn to_chunk_pos(&self) -> ChunkPos {
//         let x = if self.x < 0 {
//             ((self.x + 1) / CHUNK_WIDTH as i32) - 1
//         } else {
//             self.x / CHUNK_WIDTH as i32
//         };

//         let y = if self.z < 0 {
//             ((self.z + 1) / CHUNK_WIDTH as i32) - 1
//         } else {
//             self.z / CHUNK_WIDTH as i32
//         };

//         ChunkPos {
//             x: x as i16,
//             y: y as i16,
//         }
//     }
// }

impl ChunkPos {
    pub fn to_world_index(&self) -> i32 {
        let x = self.x as i32;
        let y = self.y as i32;
        x + (y << 16)
    }

    pub fn to_id(&self) -> u64 {
        let a = if self.x >= 0 {
            (2 * self.x as i64) as u64
        } else {
            (-2 * self.x as i64 - 1) as u64
        };

        let b = if self.y >= 0 {
            (2 * self.y as i64) as u64
        } else {
            (2 * -self.y as i64 - 1) as u64
        };

        ((a + b) * (a + b + 1)) / 2 + a
    }

    pub fn from_id(z: ChunkId) -> ChunkPos {
        let w = (((8 * z + 1) as f64).sqrt() - 1.0) / 2.0;
        let w = w.floor() as u64;
        let t = (w * w + w) / 2;
        let a = (z - t) as i32;
        let b = (w as i32) - a;

        let x = if a % 2 == 0 {
            (a / 2) as i16
        } else {
            (-(a + 1) / 2) as i16
        };

        let y = if b % 2 == 0 {
            (b / 2) as i16
        } else {
            (-(b + 1) / 2) as i16
        };

        ChunkPos { x, y }
    }

    pub fn to_world_pos(&self) -> WorldPos {
        WorldPos {
            x: self.x as i32 * CHUNK_WIDTH as i32 + CHUNK_WIDTH as i32 / 2,
            y: 0,
            z: self.y as i32 * CHUNK_WIDTH as i32 + CHUNK_WIDTH as i32 / 2,
        }
    }
}

impl std::ops::Add<ChunkPos> for ChunkPos {
    type Output = ChunkPos;
    fn add(self, other: ChunkPos) -> ChunkPos {
        ChunkPos {
            x: self.x + other.x,
            y: self.y + other.y,
        }
    }
}
