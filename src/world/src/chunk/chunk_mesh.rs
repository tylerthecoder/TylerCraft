use crate::{
    direction::Directions,
    positions::{ChunkPos, InnerChunkPos, WorldPos},
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone)]
pub struct ChunkMesh {
    face_map: HashMap<usize, Directions>,
    chunk_pos: ChunkPos,
}

impl ChunkMesh {
    pub fn new(chunk_pos: ChunkPos) -> Self {
        ChunkMesh {
            face_map: HashMap::new(),
            chunk_pos,
        }
    }

    pub fn insert(&mut self, world_pos: WorldPos, directions: Directions) -> () {
        self.face_map
            .insert(world_pos.to_inner_chunk_pos().to_chunk_index(), directions);
    }

    pub fn get(&self, world_pos: WorldPos) -> Option<&Directions> {
        self.face_map
            .get(&world_pos.to_inner_chunk_pos().to_chunk_index())
    }
}

impl IntoIterator for &ChunkMesh {
    type Item = (WorldPos, Directions);
    type IntoIter = std::vec::IntoIter<(WorldPos, Directions)>;

    fn into_iter(self) -> Self::IntoIter {
        self.face_map
            .iter()
            .map(|(index, directions)| {
                let t = (
                    InnerChunkPos::make_from_chunk_index(*index).to_world_pos(&self.chunk_pos),
                    *directions,
                );
                t
            })
            .collect::<Vec<(WorldPos, Directions)>>()
            .into_iter()
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        chunk::chunk_mesh::ChunkMesh,
        direction::Directions,
        positions::{ChunkPos, WorldPos},
    };

    #[test]
    fn test_insert() {
        let chunk_pos = ChunkPos::new(0, 0);
        let mut chunk_mesh = ChunkMesh::new(chunk_pos);
        let world_pos = WorldPos::new(0, 0, 0);
        let directions = Directions::all();
        chunk_mesh.insert(world_pos, directions);
        assert_eq!(chunk_mesh.get(world_pos), Some(&directions));
    }

    #[test]
    fn test_empty() {
        let chunk_pos = ChunkPos::new(0, 0);
        let chunk_mesh = ChunkMesh::new(chunk_pos);
        let world_pos = WorldPos::new(0, 0, 0);
        assert_eq!(chunk_mesh.get(world_pos), None);
    }
}
