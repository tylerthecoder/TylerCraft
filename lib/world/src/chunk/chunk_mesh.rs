use crate::{
    components::world_pos::WorldPos,
    direction::Directions,
    plane::WorldPlane,
    positions::{ChunkPos, InnerChunkPos},
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tsify::Tsify;

#[derive(Tsify, Serialize, Deserialize, Clone)]
pub struct ChunkMesh {
    face_map: HashMap<usize, Directions>,
    chunk_pos: ChunkPos,
}

#[derive(PartialEq, Debug, Serialize, Deserialize)]
pub struct BlockMesh {
    pub world_pos: WorldPos,
    pub directions: Directions,
}

impl IntoIterator for &BlockMesh {
    type Item = WorldPlane;
    type IntoIter = std::vec::IntoIter<WorldPlane>;
    fn into_iter(self) -> Self::IntoIter {
        self.directions
            .into_iter()
            .map(|direction| WorldPlane::new(self.world_pos, direction))
            .collect::<Vec<WorldPlane>>()
            .into_iter()
    }
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

    pub fn get(&self, world_pos: WorldPos) -> BlockMesh {
        let empty = Directions::empty();
        let mesh = self
            .face_map
            .get(&world_pos.to_inner_chunk_pos().to_chunk_index())
            .unwrap_or(&empty);

        BlockMesh {
            world_pos,
            directions: mesh.to_owned(),
        }
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
        chunk::chunk_mesh::{BlockMesh, ChunkMesh},
        components::world_pos::WorldPos,
        direction::Directions,
        positions::ChunkPos,
        vec::Vector3Ops,
    };

    #[test]
    fn test_insert() {
        let chunk_pos = ChunkPos::new(0, 0);
        let mut chunk_mesh = ChunkMesh::new(chunk_pos);
        let world_pos = WorldPos::new(0, 0, 0);
        let directions = Directions::all();
        chunk_mesh.insert(world_pos.clone(), directions);
        assert_eq!(
            chunk_mesh.get(world_pos.clone()),
            BlockMesh {
                world_pos,
                directions
            }
        );
    }

    #[test]
    fn test_empty() {
        let chunk_pos = ChunkPos::new(0, 0);
        let chunk_mesh = ChunkMesh::new(chunk_pos);
        let world_pos = WorldPos::new(0, 0, 0);
        assert_eq!(
            chunk_mesh.get(world_pos.clone()),
            BlockMesh {
                world_pos,
                directions: Directions::empty()
            }
        );
    }
}
