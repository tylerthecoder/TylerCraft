use crate::block::{BlockData, BlockType, WorldBlock};
use crate::block_getter::BlockGetter;
use crate::vec::Vec3;
use crate::world::{ChunkPos, World, WorldPos};
use serde::{Deserialize, Serialize};
use serde_big_array::BigArray;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

mod chunk_duct;
pub mod chunk_mesh;
#[cfg(test)]
mod chunk_unit_tests;

pub const CHUNK_WIDTH: i16 = 16;
pub const CHUNK_HEIGHT: i16 = 64;

const CHUNK_MEM_SIZE: usize = (CHUNK_HEIGHT * CHUNK_WIDTH * CHUNK_WIDTH) as usize;

pub type InnerChunkPos = Vec3<i8>;

impl InnerChunkPos {
    pub fn to_chunk_index(&self) -> usize {
        let x_part = (self.x as usize) << (4 + 6);
        let y_part = (self.y as usize) << 4;
        let z_part = self.z as usize;
        x_part + y_part + z_part
    }

    pub fn make_from_chunk_index(index: usize) -> InnerChunkPos {
        let x_part = (index >> (4 + 6)) as i8;
        let y_part = ((index & 01111110000) >> 4) as i8;
        let z_part = (index & 0b1111) as i8;
        InnerChunkPos::new(x_part, y_part, z_part)
    }

    pub fn to_world_pos(&self, chunk_pos: &ChunkPos) -> WorldPos {
        chunk_pos
            .scalar_mul(CHUNK_WIDTH)
            .move_to_3d(0)
            .map(|x| x as i8)
            .add_vec(*self)
            .map(|x| x as i32)
    }
}

pub struct ChunkBlock {
    pub block_type: BlockType,
    pub extra_data: BlockData,
    pub pos: InnerChunkPos,
}

#[derive(Serialize, Deserialize)]
#[wasm_bindgen]
pub struct Chunk {
    #[serde(with = "BigArray")]
    blocks: [BlockType; CHUNK_MEM_SIZE],
    block_data: HashMap<usize, BlockData>,
    #[wasm_bindgen(skip)]
    pub position: ChunkPos,
}

impl Chunk {
    pub fn new(position: ChunkPos) -> Chunk {
        Chunk {
            blocks: [BlockType::Void; CHUNK_MEM_SIZE],
            block_data: HashMap::new(),
            position,
        }
    }

    fn get_all_non_void_chunk_pos(&self) -> Vec<InnerChunkPos> {
        self.blocks
            .iter()
            .enumerate()
            .filter(|(_i, &b)| b != BlockType::Void)
            .map(|(index, _block_type)| InnerChunkPos::make_from_chunk_index(index))
            .collect()
    }

    pub fn get_all_blocks(&self) -> Vec<ChunkBlock> {
        self.blocks
            .iter()
            .enumerate()
            .filter(|(_i, &b)| b != BlockType::Void)
            .map(|(index, _block_type)| {
                self.get_block(&InnerChunkPos::make_from_chunk_index(index))
            })
            .collect()
    }

    pub fn get_uuid(&self) -> String {
        self.position.to_index()
    }

    pub fn add_block(&mut self, block: ChunkBlock) {
        let index = block.pos.to_chunk_index();
        self.block_data.insert(index, block.extra_data);
        self.blocks[index] = block.block_type;
    }

    fn chunk_pos_to_world_pos(&self, chunk_pos: &InnerChunkPos) -> WorldPos {
        self.position
            .scalar_mul(CHUNK_WIDTH)
            .move_to_3d(0)
            .map(|x| x as i8)
            .add_vec(*chunk_pos)
            .map(|x| x as i32)
    }

    fn get_block_type_at_index(&self, index: usize) -> BlockType {
        match self.blocks.get(index) {
            Some(block) => *block,
            None => BlockType::Void,
        }
    }

    fn get_block_data_from_index(&self, index: &usize) -> &BlockData {
        self.block_data.get(index).unwrap_or(&BlockData::None)
    }

    fn get_world_block_from_index(&self, index: usize) -> WorldBlock {
        let block_type = self.get_block_type_at_index(index);
        let block_data = self.get_block_data_from_index(&index);
        let inner_chunk_pos = InnerChunkPos::make_from_chunk_index(index);

        let world_pos = self.chunk_pos_to_world_pos(&inner_chunk_pos);

        WorldBlock {
            block_type,
            extra_data: *block_data,
            world_pos,
        }
    }

    fn get_block_type(&self, pos: &InnerChunkPos) -> BlockType {
        self.get_block_type_at_index(pos.to_chunk_index())
    }

    fn get_block_data(&self, pos: &InnerChunkPos) -> &BlockData {
        self.get_block_data_from_index(&pos.to_chunk_index())
    }

    pub fn get_world_block(&self, pos: &InnerChunkPos) -> WorldBlock {
        self.get_world_block_from_index(pos.to_chunk_index())
    }

    pub fn get_block(&self, pos: &InnerChunkPos) -> ChunkBlock {
        let index = pos.to_chunk_index();
        let block_type = self.get_block_type_at_index(index);
        let block_data = self.get_block_data_from_index(&index);
        let inner_chunk_pos = InnerChunkPos::make_from_chunk_index(index);

        ChunkBlock {
            block_type,
            extra_data: *block_data,
            pos: inner_chunk_pos,
        }
    }

    pub fn remove_block(&mut self, pos: &InnerChunkPos) -> () {
        let index = pos.to_chunk_index();
        self.blocks[index] = BlockType::Void;
        let world_block = self.get_world_block_from_index(index);
    }
}

// impl BlockGetter for Chunk {
//     fn get_block(&self, pos: &WorldPos) -> WorldBlock {
//         self.get_world_block(&chunk_pos)
//     }
// }
