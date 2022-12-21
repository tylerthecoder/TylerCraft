use crate::block::{get_visible_faces, BlockData, BlockType, WorldBlock};
use crate::chunk::chunk_mesh::ChunkMesh;
use crate::chunk::{Chunk, InnerChunkPos, CHUNK_WIDTH};
use crate::direction::Directions;
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

impl WorldPos {
    pub fn to_inner_chunk_pos(&self) -> InnerChunkPos {
        let x = ((self.x as i8 % 16) + 16) % 16;
        let y = self.y as i8;
        let z = ((self.z as i8 % 16) + 16) % 16;
        InnerChunkPos::new(x, y, z)
    }

    pub fn to_chunk_pos(&self) -> ChunkPos {
        let x = if self.x < 0 {
            ((self.x + 1) / CHUNK_WIDTH as i32) - 1
        } else {
            self.x / CHUNK_WIDTH as i32
        };

        let y = if self.z < 0 {
            ((self.z + 1) / CHUNK_WIDTH as i32) - 1
        } else {
            self.z / CHUNK_WIDTH as i32
        };

        ChunkPos {
            x: x as i16,
            y: y as i16,
        }
    }
}

impl ChunkPos {
    pub fn to_world_index(&self) -> i32 {
        let x = self.x as i32;
        let y = self.y as i32;
        x + (y << 16)
    }
}

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

#[wasm_bindgen]
#[derive(Default)]
pub struct World {
    chunks: HashMap<i32, Chunk>,
    chunk_meshes: HashMap<i32, ChunkMesh>,
}

impl World {
    /* Chunk Logic */
    pub fn get_chunk(&self, chunk_pos: &ChunkPos) -> Result<&Chunk, ChunkNotLoadedError> {
        self.chunks
            .get(&chunk_pos.to_world_index())
            .ok_or(ChunkNotLoadedError)
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

    pub fn insert_chunk(&mut self, chunk: Chunk) -> () {
        self.chunks.insert(chunk.position.to_world_index(), chunk);
        // Update the chunks

        chunk.position.get_adjacent_vecs().iter().map(|pos| {
            let chunk = self.get_mut_chunk(&pos);
        });
    }

    pub fn load_chunk(&mut self, chunk_pos: &ChunkPos) -> &mut Chunk {
        let chunk = Chunk::new(*chunk_pos);
        let index = chunk_pos.to_world_index();
        self.chunks.insert(index.to_owned(), chunk);
        self.chunks.get_mut(&index.to_owned()).unwrap()
    }

    /** Block Logic */

    /** Add a block to the world at a certain position and with certain data.
     * Handles adding the block to the correct chunk and updating the surrounding chunks
     * Also recalculates chunk's mesh (visible faces) for chunks adjacent to the block
     */
    pub fn add_block(&mut self, world_block: &WorldBlock) -> Result<(), ChunkNotLoadedError> {
        let chunk = self.get_mut_chunk(&world_block.world_pos.to_chunk_pos())?;

        let chunk_block = world_block.to_chunk_block();

        self.update_chunks_around_block(&world_block.world_pos);

        chunk.add_block(chunk_block);

        Ok(())
    }

    pub fn remove_block(&mut self, world_pos: &WorldPos) -> Result<(), ChunkNotLoadedError> {
        let chunk = self.get_mut_chunk(&world_pos.to_chunk_pos())?;
        self.update_chunks_around_block(world_pos);
        chunk.remove_block(self, &world_pos.to_inner_chunk_pos());
        Ok(())
    }

    /* Mesh Logic */

    fn update_mesh_at_pos(&self, world_pos: WorldPos) -> Result<(), ChunkNotLoadedError> {
        let chunk_mesh = self.get_chunk_mesh(&world_pos.to_chunk_pos())?;
        let world_block = self.get_block(&world_pos);

        let faces = get_visible_faces(&world_block, self);

        chunk_mesh
            .face_map
            .insert(world_pos.to_inner_chunk_pos().to_chunk_index(), faces);

        Ok(())
    }

    fn get_chunk_mesh(&self, chunk_pos: &ChunkPos) -> Result<&ChunkMesh, ChunkNotLoadedError> {
        self.chunk_meshes
            .get(&chunk_pos.to_world_index())
            .ok_or(ChunkNotLoadedError)
    }

    fn update_chunk_mesh(&mut self, chunk_pos: &ChunkPos) -> Result<(), ChunkNotLoadedError> {
        let chunk_mesh = self.get_chunk_mesh(chunk_pos)?;
        let chunk = self.get_chunk(chunk_pos)?;
        for block in chunk.get_all_blocks() {
            self.update_mesh_at_pos(block.pos.to_world_pos(chunk_pos));
        }

        Ok(())
    }

    /**
     * Updates all chunks surrounding a block.
     * Does not update the chunk the block is in.
     */
    fn update_chunks_around_block(&mut self, world_pos: &WorldPos) -> () {
        // Check to see if any of the adjacent blocks are in different chunks.
        // Don't need to filter out duplicates since they aren't possible
        let chunks_to_update = world_pos
            .get_adjacent_vecs()
            .iter()
            // Map to chunk id
            .map(|world_pos: &WorldPos| world_pos.to_chunk_pos())
            // Don't include the current chunk
            .filter(|chunk_pos: &ChunkPos| chunk_pos != &world_pos.to_chunk_pos())
            // Map to chunk
            .for_each(|chunk_pos: ChunkPos| {
                // Forget about the result, if the chunk isn't loaded, it doesn't matter
                self.update_chunk_mesh(&chunk_pos);
            });

        ()
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
    pub fn get_block(&self, world_pos: &WorldPos) -> WorldBlock {
        let chunk = self.get_chunk(&world_pos.to_chunk_pos());

        chunk.map_or(WorldBlock::empty(*world_pos), |chunk| {
            chunk.get_world_block(&world_pos.to_inner_chunk_pos())
        })
    }
}
