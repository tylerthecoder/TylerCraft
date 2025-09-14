use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use crate::{
    chunk::{chunk_pos::ChunkPos, inner_chunk_pos::InnerChunkPos, CHUNK_HEIGHT, CHUNK_WIDTH},
    entities::entity_component::impl_component,
    geometry::vec::{impl_vector_ops, Vector3Ops},
};

use super::fine_world_pos::FineWorldPos;

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
#[wasm_bindgen]
pub struct WorldPos {
    pub x: i32,
    pub y: i32,
    pub z: i32,
}

impl_component!(WorldPos);

impl_vector_ops!(WorldPos, i32);

#[wasm_bindgen]
impl WorldPos {
    #[wasm_bindgen(constructor)]
    pub fn new_wasm(x: i32, y: i32, z: i32) -> WorldPos {
        WorldPos { x, y, z }
    }

    pub fn is_valid(&self) -> bool {
        self.y >= 0 && self.y < 256
    }

    pub fn to_fine_world_pos(&self) -> FineWorldPos {
        FineWorldPos {
            x: self.x as f32,
            y: self.y as f32,
            z: self.z as f32,
        }
    }

    pub fn to_inner_chunk_pos(&self) -> InnerChunkPos {
        let x =
            (((self.x as i8 % CHUNK_WIDTH as i8) + CHUNK_WIDTH as i8) % CHUNK_WIDTH as i8) as i8;
        let y = ((self.y as i8 % CHUNK_HEIGHT as i8) + CHUNK_HEIGHT as i8) % CHUNK_HEIGHT as i8;
        let z =
            (((self.z as i8 % CHUNK_WIDTH as i8) + CHUNK_WIDTH as i8) % CHUNK_WIDTH as i8) as i8;
        InnerChunkPos::new(x, y, z)
    }

    pub fn to_chunk_pos(&self) -> ChunkPos {
        let x = if self.x < 0 {
            ((self.x + 1) / CHUNK_WIDTH as i32) - 1
        } else {
            self.x / CHUNK_WIDTH as i32
        };

        let y = if self.z < 0 {
            ((self.z + 1) / CHUNK_WIDTH as i32) - 1
        } else {
            self.z / CHUNK_WIDTH as i32
        };

        ChunkPos {
            x: x as i16,
            y: y as i16,
        }
    }
}
