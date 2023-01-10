use crate::{
    chunk::Chunk,
    positions::{ChunkPos, WorldPos},
};

use super::{ChunkNotLoadedError, World, WorldStateDiff};

impl World {
    pub fn get_chunk(&self, chunk_pos: &ChunkPos) -> Result<&Chunk, ChunkNotLoadedError> {
        self.chunks
            .get(&chunk_pos.to_world_index())
            .ok_or(ChunkNotLoadedError)
    }

    pub fn has_chunk(&self, chunk_pos: &ChunkPos) -> bool {
        self.chunks.contains_key(&chunk_pos.to_world_index())
    }

    pub fn get_chunk_from_world_pos(
        &self,
        world_pos: &WorldPos,
    ) -> Result<&Chunk, ChunkNotLoadedError> {
        self.get_chunk(&world_pos.to_chunk_pos())
    }

    pub fn get_mut_chunk(
        &mut self,
        chunk_pos: &ChunkPos,
    ) -> Result<&mut Chunk, ChunkNotLoadedError> {
        self.chunks
            .get_mut(&chunk_pos.to_world_index())
            .ok_or(ChunkNotLoadedError)
    }

    pub fn insert_chunk(&mut self, chunk: Chunk) -> WorldStateDiff {
        // Update adjacent chunk meshes
        let updated_chunk_ids: Vec<String> = chunk
            .position
            .get_adjacent_vecs()
            .iter()
            .filter_map(|chunk_pos| {
                if self.update_chunk_mesh(chunk_pos).is_ok() {
                    Some(chunk_pos.to_index())
                } else {
                    None
                }
            })
            .collect();

        self.chunks.insert(chunk.position.to_world_index(), chunk);

        WorldStateDiff {
            chunk_ids: updated_chunk_ids,
        }
    }

    pub fn load_chunk(&mut self, chunk_pos: &ChunkPos) -> &mut Chunk {
        let chunk = Chunk::new(*chunk_pos);
        let index = chunk_pos.to_world_index();
        self.chunks.insert(index.to_owned(), chunk);
        self.chunks.get_mut(&index.to_owned()).unwrap()
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        block::{BlockData, BlockType, ChunkBlock},
        chunk::Chunk,
        positions::{ChunkPos, InnerChunkPos},
        world::World,
    };

    #[test]
    fn adds_chunks() {
        let mut world = World::default();

        let chunk_pos = ChunkPos::new(0, 0);
        let inner_chunk_pos = InnerChunkPos::new(0, 0, 1);

        let mut chunk = Chunk::new(chunk_pos);

        let chunk_block = ChunkBlock {
            block_type: BlockType::Cloud,
            extra_data: BlockData::None,
            pos: InnerChunkPos::new(0, 0, 1),
        };

        chunk.add_block(chunk_block);

        world.insert_chunk(chunk);

        let same_chunk = world.get_chunk(&chunk_pos).unwrap();

        let same_block = same_chunk.get_block(&inner_chunk_pos);

        assert_eq!(same_block.block_type, BlockType::Cloud);
    }
}
