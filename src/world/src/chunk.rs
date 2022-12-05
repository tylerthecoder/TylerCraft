use crate::block::{get_visible_faces, BlockData, BlockType, WorldBlock};
use crate::direction::Directions;
use crate::utils::js_log;
use crate::vec::Vec3;
use crate::world::{ChunkPos, World, WorldPos};
use serde::{Deserialize, Serialize};
use serde_big_array::BigArray;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

mod chunk_duct;
#[cfg(test)]
mod chunk_unit_tests;

pub const CHUNK_WIDTH: i16 = 16;
pub const CHUNK_HEIGHT: i16 = 64;

const CHUNK_MEM_SIZE: usize = (CHUNK_HEIGHT * CHUNK_WIDTH * CHUNK_WIDTH) as usize;

pub type InnerChunkPos = Vec3<i8>;

#[derive(Serialize, Deserialize)]
pub struct BlockWithFaces {
    pub world_pos: WorldPos,
    // true is the face is visible
    pub faces: Directions,
}

pub type VisibleFaces = Vec<BlockWithFaces>;

#[derive(Serialize, Deserialize)]
#[wasm_bindgen]
pub struct Chunk {
    #[serde(with = "BigArray")]
    blocks: [BlockType; CHUNK_MEM_SIZE],
    block_data: HashMap<usize, BlockData>,
    #[wasm_bindgen(skip)]
    pub visible_faces: VisibleFaces,
    #[wasm_bindgen(skip)]
    pub position: ChunkPos,
}

impl Chunk {
    fn pos_to_index(pos: &InnerChunkPos) -> usize {
        let x_part = (pos.x as usize) << (4 + 6);
        let y_part = (pos.y as usize) << 4;
        let z_part = pos.z as usize;
        x_part + y_part + z_part
    }

    fn index_to_pos(index: usize) -> InnerChunkPos {
        let x_part = (index >> (4 + 6)) as i8;
        let y_part = ((index & 01111110000) >> 4) as i8;
        let z_part = (index & 0b1111) as i8;
        InnerChunkPos::new(x_part, y_part, z_part)
    }

    pub fn new(position: ChunkPos) -> Chunk {
        Chunk {
            blocks: [BlockType::Void; CHUNK_MEM_SIZE],
            block_data: HashMap::new(),
            visible_faces: Vec::new(),
            position,
        }
    }

    pub fn calculate_visible_faces(&mut self, world: &World) -> () {
        let data: Vec<BlockWithFaces> = self
            .blocks
            .iter()
            .enumerate()
            .filter(|(_i, &b)| b != BlockType::Void)
            .map(|(index, block_type)| {
                let block = self.get_full_block_from_index(index);

                let block_from_world = world.get_block(&block.world_pos);

                if block_from_world.block_type != block.block_type {
                    js_log(&format!(
                        "block_from_world.block_type != block.block_type: {:?} != {:?}",
                        block_from_world.block_type, block.block_type
                    ));
                }

                if block.world_pos != block_from_world.world_pos {
                    js_log(&format!(
                        "block.world_pos != block_from_world.world_pos: {:?} != {:?}",
                        block.world_pos, block_from_world.world_pos
                    ));
                }

                if block.block_type == BlockType::Void {
                    js_log(&format!("Setting as void {:?}", block_type));
                }
                BlockWithFaces {
                    faces: get_visible_faces(&block, world),
                    world_pos: block.world_pos,
                }
            })
            .collect();

        js_log(&format!("Visible faces length: {:?}", data.len()));

        self.visible_faces = data;
    }

    pub fn get_uuid(&self) -> String {
        self.position.to_index()
    }

    pub fn add_block(&mut self, pos: &InnerChunkPos, block: BlockType, block_data: BlockData) {
        let index = Self::pos_to_index(pos);
        self.block_data.insert(index, block_data);
        self.blocks[index] = block
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

    fn get_full_block_from_index(&self, index: usize) -> WorldBlock {
        let block_type = self.get_block_type_at_index(index);
        let block_data = self.get_block_data_from_index(&index);
        let inner_chunk_pos = Self::index_to_pos(index);

        let world_pos = self.chunk_pos_to_world_pos(&inner_chunk_pos);

        WorldBlock {
            block_type,
            extra_data: *block_data,
            world_pos,
        }
    }

    pub fn get_block(&self, pos: &InnerChunkPos) -> BlockType {
        let index = Self::pos_to_index(pos);
        self.get_block_type_at_index(index)
    }

    pub fn get_full_block(&self, pos: &InnerChunkPos) -> WorldBlock {
        let index = Self::pos_to_index(pos);
        self.get_full_block_from_index(index)
    }

    pub fn get_block_data(&self, pos: &InnerChunkPos) -> &BlockData {
        let index = Self::pos_to_index(pos);
        self.get_block_data_from_index(&index)
    }

    pub fn remove_block(&mut self, pos: &InnerChunkPos) -> () {
        let index = Self::pos_to_index(pos);
        self.blocks[index] = BlockType::Void;
    }
}
