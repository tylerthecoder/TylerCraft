use super::{ChunkNotLoadedError, World, WorldStateDiff};
use crate::{
    chunk::chunk_mesh::ChunkMesh,
    direction::Directions,
    positions::{ChunkPos, WorldPos},
};

impl World {
    pub fn update_mesh_at_pos(&mut self, world_pos: WorldPos) -> Result<(), ChunkNotLoadedError> {
        let world_block = self.get_block(&world_pos);

        let adj_blocks = self.get_adjacent_blocks(&world_pos);

        let faces = world_block.get_visible_faces(adj_blocks);

        let chunk_mesh = self.get_chunk_mesh_mut(&world_pos.to_chunk_pos())?;

        chunk_mesh.insert(world_pos, faces);

        Ok(())
    }

    pub fn get_mesh_at_pos(&self, world_pos: WorldPos) -> Result<Directions, ChunkNotLoadedError> {
        let mesh = self.get_chunk_mesh(&world_pos.to_chunk_pos())?;
        let dirs = mesh.get(world_pos);

        let dirs = dirs.unwrap_or(&Directions::empty()).to_owned();
        Ok(dirs)
    }

    pub fn get_chunk_mesh(&self, chunk_pos: &ChunkPos) -> Result<&ChunkMesh, ChunkNotLoadedError> {
        self.chunk_meshes
            .get(&chunk_pos.to_world_index())
            .ok_or(ChunkNotLoadedError)
    }

    fn get_chunk_mesh_mut(
        &mut self,
        chunk_pos: &ChunkPos,
    ) -> Result<&mut ChunkMesh, ChunkNotLoadedError> {
        self.chunk_meshes
            .get_mut(&chunk_pos.to_world_index())
            .ok_or(ChunkNotLoadedError)
    }

    pub fn update_chunk_mesh(&mut self, chunk_pos: &ChunkPos) -> Result<(), ChunkNotLoadedError> {
        let chunk = self.get_chunk(chunk_pos)?;
        for block in chunk.get_all_blocks() {
            self.update_mesh_at_pos(block.pos.to_world_pos(chunk_pos))
                .ok();
        }
        Ok(())
    }

    /**
     * Updates all chunks surrounding a block.
     * Does not update the chunk the block is in.
     */
    pub fn update_chunks_around_block(&mut self, world_pos: &WorldPos) -> WorldStateDiff {
        // Check to see if any of the adjacent blocks are in different chunks.
        // Don't need to filter out duplicates since they aren't possible
        let updated_ids: Vec<String> = world_pos
            .get_adjacent_vecs()
            .iter()
            // Map to chunk id
            .map(|world_pos: &WorldPos| world_pos.to_chunk_pos())
            // Don't include the current chunk
            .filter(|chunk_pos: &ChunkPos| chunk_pos != &world_pos.to_chunk_pos())
            // Map to chunk
            .filter_map(|chunk_pos: ChunkPos| {
                // Forget about the result, if the chunk isn't loaded, it doesn't matter
                if self.update_chunk_mesh(&chunk_pos).is_ok() {
                    Some(chunk_pos.to_index())
                } else {
                    None
                }
            })
            .collect();

        WorldStateDiff {
            chunk_ids: updated_ids,
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        block::{BlockData, BlockType, ChunkBlock},
        chunk::Chunk,
        direction::Directions,
        positions::{ChunkPos, InnerChunkPos, WorldPos},
        world::{world_block::WorldBlock, World},
    };

    #[test]
    fn calculate_chunk_mesh() {
        let mut world = World::default();
        let mut chunk = Chunk::new(ChunkPos { x: 0, y: 0 });

        let world_pos = WorldPos::new(0, 0, 0);

        let world_block = WorldBlock {
            block_type: BlockType::Cloud,
            extra_data: BlockData::None,
            world_pos,
        };

        chunk.add_block(ChunkBlock {
            block_type: BlockType::Cloud,
            extra_data: BlockData::None,
            pos: InnerChunkPos::new(0, 0, 0),
        });

        world.insert_chunk(chunk);

        let chunk_mesh = world.get_mesh_at_pos(world_pos).unwrap();

        let directions = Directions::all();
        assert_eq!(chunk_mesh, directions);
    }
}
