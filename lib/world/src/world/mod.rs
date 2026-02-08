use self::world_block::WorldBlock;
use crate::block::BlockType;
use crate::chunk::chunk::Chunk;
use crate::chunk::chunk_mesh::ChunkMesh;
use crate::components::world_pos::WorldPos;
use crate::game::Game;
use crate::geometry::direction::{Direction, DirectionVectorExtension, Directions};
use rustc_hash::FxHashMap;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::{self, fmt};
use tsify::Tsify;
use wasm_bindgen::prelude::*;
pub mod world_block;
mod world_chunk;
mod world_duct;
mod world_mesh;
extern crate web_sys;

#[wasm_bindgen]
pub struct WorldPosWasm {
    pub x: i32,
    pub y: i32,
    pub z: i32,
}

#[derive(Debug, Serialize, Deserialize)]
#[wasm_bindgen]
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

pub struct AdjacentBlocks {
    pub data: [WorldBlock; 6],
}

impl AdjacentBlocks {
    pub fn new() -> Self {
        Self {
            data: [WorldBlock::empty(WorldPos { x: 0, y: 0, z: 0 }); 6],
        }
    }

    pub fn get_for_direction(&self, direction: Direction) -> &WorldBlock {
        &self.data[direction.to_index()]
    }
}

#[derive(Serialize, Deserialize)]
pub struct WorldStateDiff {
    /** A list of chunk ids that were changed */
    pub chunk_ids: HashSet<u64>,
}

#[derive(Default, Tsify, Serialize, Deserialize, Clone)]
#[wasm_bindgen]
pub struct World {
    chunks: FxHashMap<i32, Chunk>,
    // #[serde(skip)]
    chunk_meshes: FxHashMap<i32, ChunkMesh>,
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
    fn get_adjacent_blocks(&self, world_pos: &WorldPos) -> AdjacentBlocks {
        let mut adjacent_blocks = AdjacentBlocks::new();
        for direction in Directions::all() {
            let adjacent_pos = world_pos.move_direction(&direction);
            if !adjacent_pos.is_valid() {
                continue;
            }
            let block = self.get_block(&adjacent_pos);
            adjacent_blocks.data[direction.to_index()] = block;
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
}

#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(js_name = "getBlock")]
    pub fn get_block_js(&self, world_pos: &WorldPos) -> WorldBlock {
        self.world.get_block(world_pos)
    }

    #[wasm_bindgen(js_name = "getBlockType")]
    pub fn get_block_type_js(&self, world_pos: &WorldPos) -> BlockType {
        self.world.get_block(world_pos).block_type
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        block::{BlockData, BlockType},
        chunk::{chunk::Chunk, chunk_pos::ChunkPos},
        geometry::vec::Vector3Ops,
    };

    #[test]
    fn get_adjacent_blocks() {
        let mut world = World::default();
        let chunk = Chunk::new(ChunkPos { x: 0, y: 0 });
        world.insert_chunk(chunk);
        let world_pos = WorldPos::new(0, 0, 0);
        let block = WorldBlock {
            block_type: BlockType::Cloud,
            extra_data: BlockData::None,
            world_pos,
        };
        world.add_block(&block).unwrap();

        let adjacent_blocks = world.get_adjacent_blocks(&world_pos);

        // Five because there is no block below me
        assert_eq!(adjacent_blocks.data.len(), 6);
    }
}
