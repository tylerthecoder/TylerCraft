use crate::block::{BlockData, BlockType, WorldBlock};
use crate::chunk::*;
use crate::vec::{Vec2, Vec3};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::{self, fmt};
use wasm_bindgen::prelude::*;

mod world_duct;
#[cfg(test)]
mod world_unit_test;

extern crate web_sys;

pub type WorldPos = Vec3<i32>;
pub type ChunkPos = Vec2<i16>;

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

#[wasm_bindgen]
pub struct World {
    chunks: HashMap<i32, Chunk>,
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

impl World {
    pub fn new() -> World {
        World {
            chunks: HashMap::new(),
        }
    }

    fn make_chunk_pos_index(chunk_pos: &ChunkPos) -> i32 {
        let x = chunk_pos.x as i32;
        let y = chunk_pos.y as i32;
        x + (y << 16)
    }

    pub fn world_pos_to_inner_chunk_pos(world_pos: &WorldPos) -> InnerChunkPos {
        let x = ((world_pos.x as i8 % 16) + 16) % 16;
        let y = world_pos.y as i8;
        let z = ((world_pos.z as i8 % 16) + 16) % 16;
        InnerChunkPos::new(x, y, z)
    }

    pub fn world_pos_to_chunk_pos(world_pos: &WorldPos) -> ChunkPos {
        let x = if world_pos.x < 0 {
            ((world_pos.x + 1) / CHUNK_WIDTH as i32) - 1
        } else {
            world_pos.x / CHUNK_WIDTH as i32
        };

        let y = if world_pos.z < 0 {
            ((world_pos.z + 1) / CHUNK_WIDTH as i32) - 1
        } else {
            world_pos.z / CHUNK_WIDTH as i32
        };

        ChunkPos {
            x: x as i16,
            y: y as i16,
        }
    }

    pub fn get_chunk(&self, chunk_pos: &ChunkPos) -> Result<&Chunk, ChunkNotLoadedError> {
        let index = Self::make_chunk_pos_index(chunk_pos);
        self.chunks.get(&index).ok_or(ChunkNotLoadedError)
    }

    pub fn get_chunk_from_world_pos(
        &self,
        world_pos: &WorldPos,
    ) -> Result<&Chunk, ChunkNotLoadedError> {
        let chunk_pos = Self::world_pos_to_chunk_pos(world_pos);
        self.get_chunk(&chunk_pos)
    }

    pub fn insert_chunk(&mut self, chunk: Chunk) -> () {
        let index = Self::make_chunk_pos_index(&chunk.position);
        self.chunks.insert(index, chunk);
    }

    pub fn get_mut_chunk(
        &mut self,
        chunk_pos: &ChunkPos,
    ) -> Result<&mut Chunk, ChunkNotLoadedError> {
        let index = Self::make_chunk_pos_index(chunk_pos);
        self.chunks.get_mut(&index).ok_or(ChunkNotLoadedError)
    }

    pub fn load_chunk(&mut self, chunk_pos: &ChunkPos) -> &mut Chunk {
        let chunk = Chunk::new(*chunk_pos);
        let index = Self::make_chunk_pos_index(chunk_pos);
        self.chunks.insert(index.to_owned(), chunk);
        self.chunks.get_mut(&index.to_owned()).unwrap()
    }

    pub fn remove_block(&mut self, world_pos: &WorldPos) -> Result<(), ChunkNotLoadedError> {
        let chunk_pos = Self::world_pos_to_chunk_pos(world_pos);
        let chunk = self.get_mut_chunk(&chunk_pos)?;
        let block_chunk_pos = Self::world_pos_to_inner_chunk_pos(&world_pos);
        chunk.remove_block(&block_chunk_pos);
        Ok(())
    }

    pub fn add_block(
        &mut self,
        block_world_pos: &WorldPos,
        block: BlockType,
        block_data: BlockData,
    ) -> Result<(), ChunkNotLoadedError> {
        let block_chunk_pos = Self::world_pos_to_chunk_pos(block_world_pos);
        let chunk = self.get_mut_chunk(&block_chunk_pos)?;
        let chunk_internal_pos = Self::world_pos_to_inner_chunk_pos(block_world_pos);
        chunk.add_block(&chunk_internal_pos, block, block_data);
        Ok(())
    }

    /** A block is loaded if the chunk it is in has been generated.
     * Does not necessarily mean the block is visible.
     */
    pub fn is_block_loaded(&self, block_world_pos: &WorldPos) -> bool {
        let chunk = self.get_chunk_from_world_pos(&block_world_pos);
        chunk.is_ok()
    }

    /** Returns void block when the chunk isn't loaded */
    /** ERROR, this isn't consistent */
    pub fn get_block(&self, block_world_pos: &WorldPos) -> WorldBlock {
        let chunk_pos = Self::world_pos_to_chunk_pos(block_world_pos);
        let chunk = self.get_chunk(&chunk_pos);

        chunk.map_or(WorldBlock::empty(*block_world_pos), |chunk| {
            let chunk_internal_pos = Self::world_pos_to_inner_chunk_pos(block_world_pos);
            chunk.get_full_block(&chunk_internal_pos)
        })
    }
}
