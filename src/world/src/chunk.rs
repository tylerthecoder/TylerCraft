
use std::collections::HashMap;
use std::convert::TryInto;

use js_sys::{Object, Array};
use serde::{Serialize, Deserialize};
use wasm_bindgen::prelude::*;
use crate::direction::{Directions, Direction};
use crate::vec::Vec3;
use crate::world::{WorldPos, World, ChunkPos};
use crate::block::{ BlockType, BlockData, BlockMetaData, cube_faces, get_visible_faces, WorldBlock, WasmBlock, WasmImageData};


pub const CHUNK_WIDTH: i16 = 16;
pub const CHUNK_HEIGHT: i16 = 64;

const CHUNK_MEM_SIZE: usize = (CHUNK_HEIGHT * CHUNK_WIDTH * CHUNK_WIDTH ) as usize;

pub type InnerChunkPos = Vec3<i8>;

#[derive(Serialize, Deserialize)]
pub struct BlockWithFaces {
    world_pos: WorldPos,
    /// true is the face is visible
    faces: Directions
}

pub type VisibleFaces = Vec<BlockWithFaces>;



#[wasm_bindgen]
pub struct WasmChunkPos {
	pub x: i16,
	pub y: i16,
}

#[wasm_bindgen]
pub struct WasmChunkInnerPos {
	pub x: i32,
	pub y: i32,
	pub z: i32,
}

#[derive(Serialize, Deserialize)]
pub struct WasmChunk {
    pub blocks: Vec<BlockType>,
    pub block_data: HashMap<usize, BlockData>,
    pub position: ChunkPos
}

// #[wasm_bindgen]
// impl WasmChunk {

//     pub fn new(chunk_pos: WasmChunkPos) -> WasmChunk {
//         let pos = ChunkPos {
//             x: chunk_pos.x,
//             y: chunk_pos.y,
//         };
//         WasmChunk {
//             chunk: Chunk::new(pos),
//             chunk_pos: pos,
//         }
//     }

    // pub fn make(chunk_pos: WasmChunkPos, blocks: Array, block_data: Object) -> WasmChunk {
    //     let pos = ChunkPos {
    //         x: chunk_pos.x,
    //         y: chunk_pos.y,
    //     };
    //     // let data_blocks: Vec<BlockType> = blocks.
    //     let chunk  = Chunk::make(pos, blocks, block_data);
    // }

    // pub fn get_uuid(&self) -> String {
    //     self.chunk.get_uuid()
    // }


    // pub fn get_block(&self, pos: WasmBlockPos) -> WasmBlock {
    //     let world_pos = WorldPos {
    //         x: pos.x,
    //         y: pos.y,
    //         z: pos.z,
    //     };
    //     let block = self.chunk.get_block(world_pos);

    //     WasmBlock {
    //         block_type: BlockType::Void,
    //         extra_data: Some(WasmImageData {
    //             dir: Direction::North,
    //         }),
    //     }

    // }

    // pub getVisibleFaces() {
    //     let visible_faces = self.chunk.get_visible_faces();
    //     let wasm_visible_faces = WasmVisibleFaces::new(visible_faces);
    //     return wasm_visible_faces;
    // }

// }


// #[derive(Clone)]
// #[derive(Serialize, Deserialize)]
pub struct Chunk {
    blocks: [BlockType; CHUNK_MEM_SIZE],
    block_data: HashMap<usize, BlockData>,
    pub visible_faces: VisibleFaces,
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

    pub fn new(position: ChunkPos) -> Chunk {
        Chunk {
            blocks: [BlockType::Void; CHUNK_MEM_SIZE],
            block_data: HashMap::new(),
            visible_faces: Vec::new(),
            position,
        }
    }

    pub fn make(chunk: &WasmChunk) -> Chunk {
        Chunk {
            visible_faces: Vec::new(),
            block_data: chunk.block_data.to_owned(),
            position: chunk.position.to_owned(),
            blocks: chunk.blocks.to_owned().try_into().unwrap(),
        }
    }

    pub fn serialize(&self) -> WasmChunk {
        WasmChunk {
            blocks: self.blocks.to_vec().to_owned(),
            block_data: self.block_data.to_owned(),
            position: self.position.to_owned()
        }
    }

    pub fn calculate_visible_faces(&mut self, world: &World) -> () {
        let data = self
            .blocks
            .iter()
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


    pub fn get_uuid(&self) -> String {
        self.position.to_index()
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