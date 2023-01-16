use crate::{block::WorldBlock, direction::Directions, positions::InnerChunkPos};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Default)]
pub struct ChunkMesh {
    pub face_map: HashMap<usize, Directions>,
}

pub struct WasmBlockMesh {
    pub block: WorldBlock,
    pub faces: Directions,
}
