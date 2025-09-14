use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::wasm_bindgen;

use crate::{
    chunk::chunk::CHUNK_WIDTH, components::world_pos::WorldPos,
    entities::entity_component::impl_component, geometry::vec2::impl_vec2_ops,
};

use super::chunk::ChunkId;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct ChunkPos {
    pub x: i16,
    pub y: i16,
}

impl_component!(ChunkPos);
impl_vec2_ops!(ChunkPos, i16);

#[wasm_bindgen]
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

    #[wasm_bindgen(constructor)]
    pub fn new(x: i16, y: i16) -> Self {
        ChunkPos { x, y }
    }

    pub fn add(&self, vec: &ChunkPos) -> Self {
        ChunkPos {
            x: self.x + vec.x,
            y: self.y + vec.y,
        }
    }

    pub fn scalar_mul(&self, val: i16) -> Self {
        ChunkPos {
            x: self.x * val,
            y: self.y * val,
        }
    }

    pub fn move_to_3d(&self, y_val: i16) -> WorldPos {
        WorldPos {
            x: self.x as i32,
            y: y_val as i32,
            z: self.y as i32,
        }
    }

    pub fn get_adjacent_vecs(&self) -> Vec<Self> {
        let mut vecs = Vec::new();
        vecs.push(self.clone());
        vecs.push(self.add(&ChunkPos::new(0, 1)));
        vecs.push(self.add(&ChunkPos::new(1, 0)));
        vecs.push(self.add(&ChunkPos::new(-1, 0)));
        vecs.push(self.add(&ChunkPos::new(0, -1)));
        vecs
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
