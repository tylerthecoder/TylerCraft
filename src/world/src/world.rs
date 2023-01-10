use crate::block::WorldBlock;
use crate::chunk::chunk_mesh::ChunkMesh;
use crate::chunk::Chunk;
use crate::direction::{Direction, Directions};
use crate::positions::{ChunkPos, WorldPos};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::{self, fmt};
use wasm_bindgen::prelude::*;

mod world_chunk;
mod world_duct;
mod world_intersection;
#[cfg(test)]
mod world_unit_test;

extern crate web_sys;

#[wasm_bindgen]
pub struct WorldPosWasm {
    pub x: i32,
    pub y: i32,
    pub z: i32,
}

#[wasm_bindgen]
pub struct ChunkPosWasm {
    pub x: i16,
    pub y: i16,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChunkNotLoadedError;

impl std::error::Error for ChunkNotLoadedError {}

impl fmt::Display for ChunkNotLoadedError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "Chunk not loaded")
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChunkIndexOutOfBoundsError;

impl std::error::Error for ChunkIndexOutOfBoundsError {}

impl fmt::Display for ChunkIndexOutOfBoundsError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "Chunk index out of bounds")
    }
}

#[derive(Serialize, Deserialize)]
pub struct WorldStateDiff {
    /** A list of chunk ids that were changed */
    pub chunk_ids: Vec<String>,
}

#[wasm_bindgen]
#[derive(Default)]
pub struct World {
    chunks: HashMap<i32, Chunk>,
    chunk_meshes: HashMap<i32, ChunkMesh>,
}

impl World {
    /** Block Logic */

    /** Add a block to the world at a certain position and with certain data.
     * Handles adding the block to the correct chunk
     * Also recalculates chunk's mesh (visible faces) for chunks adjacent to the block
     */
    pub fn add_block(
        &mut self,
        world_block: &WorldBlock,
    ) -> Result<WorldStateDiff, ChunkNotLoadedError> {
        let chunk = self.get_mut_chunk(&world_block.world_pos.to_chunk_pos())?;
        let chunk_block = world_block.to_chunk_block();
        chunk.add_block(chunk_block);

        Ok(self.update_chunks_around_block(&world_block.world_pos))
    }

    /** Returns void block when the chunk isn't loaded */
    /** ERROR, this isn't consistent. Idk if this is still relevant */
    pub fn get_block(&self, world_pos: &WorldPos) -> WorldBlock {
        let chunk = self.get_chunk(&world_pos.to_chunk_pos());

        chunk.map_or(WorldBlock::empty(*world_pos), |chunk| {
            chunk.get_world_block(&world_pos.to_inner_chunk_pos())
        })
    }

    /**
     * Always return all directions.
     * The directions that point to no block will just default to void
     * */
    fn get_adjacent_blocks(&self, world_pos: &WorldPos) -> HashMap<Direction, WorldBlock> {
        let mut adjacent_blocks = HashMap::new();
        for direction in Directions::all() {
            let adjacent_pos = world_pos.move_direction(&direction);
            let block = self.get_block(&adjacent_pos);
            adjacent_blocks.insert(direction, block);
        }
        adjacent_blocks
    }

    /**
     * A block is loaded if the chunk it is in has been generated.
     * Does not necessarily mean the block is visible.
     */
    pub fn is_block_loaded(&self, block_world_pos: &WorldPos) -> bool {
        let chunk = self.get_chunk_from_world_pos(&block_world_pos);
        chunk.is_ok()
    }

    pub fn remove_block(
        &mut self,
        world_pos: &WorldPos,
    ) -> Result<WorldStateDiff, ChunkNotLoadedError> {
        let chunk = self.get_mut_chunk(&world_pos.to_chunk_pos())?;
        chunk.remove_block(&world_pos.to_inner_chunk_pos());
        Ok(self.update_chunks_around_block(world_pos))
    }

    /* Mesh Logic */
    fn update_mesh_at_pos(&mut self, world_pos: WorldPos) -> Result<(), ChunkNotLoadedError> {
        let world_block = self.get_block(&world_pos);

        let faces = world_block.get_visible_faces(self.get_adjacent_blocks(&world_pos));

        let chunk_mesh = self.get_chunk_mesh_mut(&world_pos.to_chunk_pos())?;

        chunk_mesh
            .face_map
            .insert(world_pos.to_inner_chunk_pos().to_chunk_index(), faces);

        Ok(())
    }

    fn get_mesh_at_pos(&self, world_pos: WorldPos) -> Result<Directions, ChunkNotLoadedError> {
        self.get_chunk_mesh(&world_pos.to_chunk_pos())
            .and_then(|mesh| {
                let dirs = mesh
                    .face_map
                    .get(&world_pos.to_inner_chunk_pos().to_chunk_index())
                    .unwrap_or(&Directions::empty())
                    .to_owned();
                Ok(dirs)
            })
    }

    fn get_chunk_mesh(&self, chunk_pos: &ChunkPos) -> Result<&ChunkMesh, ChunkNotLoadedError> {
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

    fn update_chunk_mesh(&mut self, chunk_pos: &ChunkPos) -> Result<(), ChunkNotLoadedError> {
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
    fn update_chunks_around_block(&mut self, world_pos: &WorldPos) -> WorldStateDiff {
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
