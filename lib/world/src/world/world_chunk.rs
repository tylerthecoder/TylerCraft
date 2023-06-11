use std::collections::HashSet;

use super::{ChunkNotLoadedError, World, WorldStateDiff};
use crate::{
    chunk::{chunk_mesh::ChunkMesh, Chunk},
    positions::{ChunkPos, WorldPos},
};

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
        let updated_chunk_ids: HashSet<String> = chunk
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

        let chunk_index = chunk.position.to_world_index();
        let chunk_pos = chunk.position.to_owned();

        let chunk_mesh = ChunkMesh::new(chunk_pos);

        self.chunks.insert(chunk_index, chunk);
        self.chunk_meshes.insert(chunk_index, chunk_mesh);

        // TODO don't unwrap this error
        self.update_chunk_mesh(&chunk_pos).unwrap();

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
        positions::{ChunkPos, InnerChunkPos, WorldPos},
        world::{world_block::WorldBlock, World},
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

    #[test]
    fn adds_blocks() {
        let mut world = World::default();

        let block_pos = WorldPos::new(0, 0, 0);

        let chunk = Chunk::new(ChunkPos { x: 0, y: 0 });

        // In the first chunk
        world.insert_chunk(chunk);

        let world_block = WorldBlock {
            block_type: BlockType::Cloud,
            extra_data: BlockData::None,
            world_pos: block_pos,
        };

        world.add_block(&world_block).unwrap();

        let block = world.get_block(&block_pos);

        assert_eq!(block.block_type, BlockType::Cloud);
        assert_eq!(block.extra_data, BlockData::None);

        // In a different chunk
        let chunk2 = Chunk::new(ChunkPos { x: 1, y: 0 });
        let block_pos = WorldPos::new(16, 0, 0);

        let world_block = WorldBlock {
            block_type: BlockType::Gold,
            extra_data: BlockData::None,
            world_pos: block_pos,
        };

        world.insert_chunk(chunk2);

        world.add_block(&world_block).unwrap();

        let block = world.get_block(&block_pos);

        assert_eq!(block.block_type, BlockType::Gold);
        assert_eq!(block.extra_data, BlockData::None);
    }
}
