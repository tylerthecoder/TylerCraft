use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::wasm_bindgen;

use crate::{
    chunk::{chunk_pos::ChunkPos, CHUNK_WIDTH},
    components::world_pos::WorldPos,
    entities::entity_component::impl_component,
    geometry::vec::{impl_vector_ops, Vector3Ops},
};

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct InnerChunkPos {
    x: i8,
    y: i8,
    z: i8,
}

impl_component!(InnerChunkPos);
impl_vector_ops!(InnerChunkPos, i8);

#[wasm_bindgen]
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
