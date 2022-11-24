use crate::block::{BlockData, BlockType, WorldBlock};
use crate::chunk::{self, *};
use crate::direction::Direction;
use crate::vec::{Vec2, Vec3};
use serde_wasm_bindgen;
use std;
use std::collections::HashMap;
use std::error::Error;
use wasm_bindgen::prelude::*;

mod world_duct;
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

impl World {
    pub fn new() -> World {
        World {
            chunks: HashMap::new(),
        }
    }

    // TODO: see if we can map these to a int
    // Use a u32 and have pos be u8s?
    fn make_index(pos: &Vec3<i32>) -> String {
        let x = pos.x as usize;
        let y = pos.y as usize;
        let z = pos.z as usize;
        let index = format!("{}:{}:{}", x, y, z);
        index
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

    // fn parse_index(index: &str) -> Vec3<i32> {
    // 	let mut split = index.split(":");
    // 	let x = split.next().unwrap().parse::<usize>().unwrap();
    // 	let y = split.next().unwrap().parse::<usize>().unwrap();
    // 	let z = split.next().unwrap().parse::<usize>().unwrap();
    // 	Vec3::new(x as i32, y as i32, z as i32)
    // }

    pub fn get_chunk(&self, chunk_pos: &ChunkPos) -> Option<&Chunk> {
        let index = Self::make_chunk_pos_index(chunk_pos);
        self.chunks.get(&index)
    }

    pub fn get_chunk_from_world_pos(&self, world_pos: &WorldPos) -> Option<&Chunk> {
        let chunk_pos = Self::world_pos_to_chunk_pos(world_pos);
        self.get_chunk(&chunk_pos)
    }

    pub fn insert_chunk(&mut self, chunk: Chunk) {
        let index = Self::make_chunk_pos_index(&chunk.position);
        self.chunks.insert(index, chunk);
    }

    pub fn get_mut_chunk(&mut self, chunk_pos: &ChunkPos) -> Option<&mut Chunk> {
        let index = Self::make_chunk_pos_index(chunk_pos);
        self.chunks.get_mut(&index)
    }

    pub fn load_chunk(&mut self, chunk_pos: &ChunkPos) -> &mut Chunk {
        let chunk = Chunk::new(*chunk_pos);
        let index = Self::make_chunk_pos_index(chunk_pos);
        self.chunks.insert(index.to_owned(), chunk);
        self.chunks.get_mut(&index.to_owned()).unwrap()
    }

    pub fn remove_block(&mut self, world_pos: &WorldPos) {
        let chunk_pos = Self::world_pos_to_chunk_pos(world_pos);
        let chunk = self.get_mut_chunk(&chunk_pos).unwrap();
        let block_chunk_pos = Self::world_pos_to_inner_chunk_pos(&world_pos);
        chunk.remove_block(&block_chunk_pos);
    }

    pub fn add_block(
        &mut self,
        block_world_pos: &WorldPos,
        block: BlockType,
        block_data: BlockData,
    ) {
        let block_chunk_pos = Self::world_pos_to_chunk_pos(block_world_pos);
        let chunk = self.get_mut_chunk(&block_chunk_pos);

        match chunk {
            Some(x) => {
                let chunk_internal_pos = Self::world_pos_to_inner_chunk_pos(block_world_pos);
                x.add_block(&chunk_internal_pos, block, block_data);
            }
            None => (),
        }
    }

    /** A block is loaded if the chunk it is in has been generated.
     * Does not necessarily mean the block is visible.
     */
    pub fn is_block_loaded(&self, block_world_pos: &WorldPos) -> bool {
        let chunk = self.get_chunk_from_world_pos(&block_world_pos);
        chunk.is_some()
    }

    /** Returns void block when the chunk isn't loaded */
    pub fn get_block(&self, block_world_pos: &WorldPos) -> WorldBlock {
        let chunk_pos = Self::world_pos_to_chunk_pos(block_world_pos);
        let chunk = self.get_chunk(&chunk_pos);

        match chunk {
            Some(x) => {
                let chunk_internal_pos = Self::world_pos_to_inner_chunk_pos(block_world_pos);
                let block = x.get_full_block(&chunk_internal_pos);
                block
            }
            None => WorldBlock {
                block_type: BlockType::Void,
                extra_data: BlockData::None,
                world_pos: *block_world_pos,
            },
        }
    }
}
