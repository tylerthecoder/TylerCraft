use crate::block::{BlockData, BlockType, ChunkBlock};
use crate::positions::{ChunkPos, InnerChunkPos};
use crate::world::world_block::WorldBlock;
use serde::{Deserialize, Serialize};
use serde_big_array::BigArray;
use wasm_bindgen::prelude::*;

mod chunk_duct;
pub mod chunk_mesh;
#[cfg(test)]
mod chunk_unit_tests;


#[wasm_bindgen(typescript_custom_section)]
const ITEXT_STYLE: &'static str = r#"
interface ITextStyle {
    bold: boolean;
    italic: boolean;
    size: number;
}
"#;


pub const CHUNK_WIDTH: i16 = 16;
pub const CHUNK_HEIGHT: i16 = 64;

const CHUNK_MEM_SIZE: usize = (CHUNK_HEIGHT * CHUNK_WIDTH * CHUNK_WIDTH) as usize;

#[derive(Serialize, Deserialize)]
#[wasm_bindgen]
pub struct Chunk {
    #[serde(with = "BigArray")]
    blocks: [BlockType; CHUNK_MEM_SIZE],
    #[serde(with = "BigArray")]
    block_data: [BlockData; CHUNK_MEM_SIZE],
    #[wasm_bindgen(skip)]
    pub position: ChunkPos,

    /** TODO: I am never deleting dirty blocks, need to fix that */
    #[wasm_bindgen(skip)]
    #[serde(skip)]
    pub dirty_blocks: Vec<InnerChunkPos>,
}

impl Chunk {
    pub fn new(position: ChunkPos) -> Chunk {
        Chunk {
            blocks: [BlockType::Void; CHUNK_MEM_SIZE],
            block_data: [BlockData::None; CHUNK_MEM_SIZE],
            position,
            dirty_blocks: Vec::new(),
        }
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

    /**
     * Returns dirty blocks plus all the visible blocks
     */
    pub fn get_all_blocks_and_dirty(&self) -> Vec<ChunkBlock> {
        self.dirty_blocks
            .iter()
            .map(|pos| self.get_block(pos))
            .chain(self.get_all_blocks().into_iter())
            .collect()
    }

    pub fn get_uuid(&self) -> String {
        self.position.to_index()
    }

    pub fn add_block(&mut self, block: ChunkBlock) {
        let index = block.pos.to_chunk_index();
        self.blocks[index] = block.block_type;
        self.block_data[index] = block.extra_data;
        self.dirty_blocks.push(block.pos.clone());
    }

    fn get_block_type_at_index(&self, index: usize) -> BlockType {
        match self.blocks.get(index) {
            Some(block) => *block,
            None => BlockType::Void,
        }
    }

    fn get_block_data_from_index(&self, index: &usize) -> &BlockData {
        match self.block_data.get(*index) {
            Some(block_data) => block_data,
            None => &BlockData::None,
        }
    }

    fn get_world_block_from_index(&self, index: usize) -> WorldBlock {
        let block_type = self.get_block_type_at_index(index);
        let block_data = self.get_block_data_from_index(&index);
        let inner_chunk_pos = InnerChunkPos::make_from_chunk_index(index);

        WorldBlock {
            block_type,
            extra_data: *block_data,
            world_pos: inner_chunk_pos.to_world_pos(&self.position),
        }
    }

    fn get_block_type(&self, pos: &InnerChunkPos) -> BlockType {
        self.get_block_type_at_index(pos.to_chunk_index())
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
        self.block_data[index] = BlockData::None;
        self.dirty_blocks.push(pos.clone());
    }

    pub fn clean(&mut self) {
        self.dirty_blocks.clear();
    }
}
