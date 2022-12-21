use crate::direction::Directions;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Default)]
pub struct ChunkMesh {
    pub face_map: HashMap<usize, Directions>,
}
