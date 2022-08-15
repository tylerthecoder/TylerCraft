
use std::collections::HashMap;

use wasm_bindgen::prelude::*;
use crate::direction::Directions;
use crate::vec::Vec3;
use crate::world::{WorldPos, World, ChunkPos};
use crate::block::{Block, BlockType, BlockData, BlockMetaData, cube_faces, get_visible_faces, WorldBlock};


pub const CHUNK_WIDTH: i16 = 16;
pub const CHUNK_HEIGHT: i16 = 64;

const CHUNK_MEM_SIZE: usize = (CHUNK_HEIGHT * CHUNK_WIDTH * CHUNK_WIDTH ) as usize;

pub type InnerChunkPos = Vec3<i8>;

pub struct BlockWithFaces {
    world_pos: WorldPos,
    /// true is the face is visible
    faces: Directions
}

pub type VisibleFaces = Vec<BlockWithFaces>;

#[wasm_bindgen]
pub struct WasmChunk {


}

#[wasm_bindgen]
impl WasmChunk {
    pub fn new() -> WasmChunk {
        WasmChunk {

        }
    }


     pub fn each(&self, f: &js_sys::Function) {
        let this = JsValue::null();
        for &x in &self.xs {
            let x = JsValue::from(x);
            let _ = f.call1(&this, &x);
        }
    }
}


// #[derive(Clone)]
pub struct Chunk {
    blocks: [BlockType; CHUNK_MEM_SIZE],
    block_data: HashMap<usize, BlockData>,
    visible_faces: VisibleFaces,
    pub position: ChunkPos
}

impl Chunk {
    fn pos_to_index(pos: &InnerChunkPos) -> usize {
        let x_part = (pos.x as usize) << (4+6);
        let y_part = (pos.y as usize) << 4;
        let z_part = pos.z as usize;
        x_part + y_part + z_part
    }

    fn index_to_pos(index: usize) -> InnerChunkPos {
        let x_part = (index >> (4+ 6)) as i8;
        let y_part = ((index & 01111110000) >> 4) as i8;
        let z_part = (index & 0b1111) as i8;
        InnerChunkPos::new(x_part, y_part, z_part)
    }

    pub fn calculate_visible_faces(&mut self, world: &World) -> () {
        let data = self
            .blocks
            .into_iter()
            .filter(|&b| *b != BlockType::Void)
            .enumerate()
            .map(|(index, block_type)| {
                let block = self.get_full_block_from_index(index);
                BlockWithFaces {
                    faces: get_visible_faces(&block, world),
                    world_pos: block.world_pos
                }
            })
            .collect();


        self.visible_faces = data;
    }


    pub fn new(position: ChunkPos) -> Chunk {
        Chunk {
            blocks: [BlockType::Void; CHUNK_MEM_SIZE],
            block_data: HashMap::new(),
            visible_faces: Vec::new(),
            position,
        }
    }

    pub fn add_block(&mut self, pos: &InnerChunkPos, block: BlockType, blockData: BlockData) {
        let index = Self::pos_to_index(pos);
        self.block_data.insert(index, blockData);
        self.blocks[index] = block
    }

    fn chunk_pos_to_world_pos(&self, chunk_pos: &InnerChunkPos) -> WorldPos {
        self
            .position
            .scalar_mul(CHUNK_WIDTH)
            .move_to_3d(0)
            .map(|x| x as i8)
            .add_vec(*chunk_pos)
            .map(|x| x as i32)
    }


    fn get_block_type_at_index(&self, index: usize) -> BlockType {
        match self.blocks.get(index) {
            Some(block) => *block,
            None => BlockType::Void
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

        println!("CHUNK: world_pos, inner_chunk_pos {:?} {:?} {:?}", index, inner_chunk_pos, world_pos);

        WorldBlock {
            block: Block {
                block_type,
                extra_data: *block_data
            },
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


mod tests {
    use crate::world::{ChunkPos, WorldPos};

    use super::{Chunk, InnerChunkPos};

    #[test]
    fn index_conversion() {
        let index = Chunk::pos_to_index(&InnerChunkPos::new(1, 2, 3));
        assert_eq!(index, 1024 + 32 + 3);
        let pos = Chunk::index_to_pos(index);
        assert_eq!(pos, InnerChunkPos::new(1, 2, 3));
    }

    #[test]
    fn conversion() {
        let inner_chunk_pos = InnerChunkPos::new(1, 2, 3);
        let chunk = Chunk::new(ChunkPos { x: 0, y: 0 });

        let world_pos = chunk.chunk_pos_to_world_pos(&inner_chunk_pos);

        assert_eq!(world_pos, WorldPos { x: 1, y: 2, z: 3 });

    }
}