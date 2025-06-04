use crate::{
    direction::Direction,
    positions::{ChunkPos, InnerChunkPos},
    world::world_block::WorldBlock,
};
use serde::{Deserialize, Serialize};
use serde_repr::{Deserialize_repr, Serialize_repr};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Eq, Hash, PartialEq, Clone, Copy, Debug, Serialize_repr, Deserialize_repr)]
#[repr(u8)]
pub enum BlockType {
    Void = 0,
    Stone = 1,
    Wood = 2,
    Leaf = 3,
    Cloud = 4,
    Gold = 5,
    RedFlower = 6,
    Water = 7,
    Grass = 8,
    Image = 9,
    Planks = 10,
    Red = 11,
}

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub struct WasmImageData {
    pub dir: Direction,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct ChunkBlock {
    pub block_type: BlockType,
    pub extra_data: BlockData,
    pub pos: InnerChunkPos,
}

impl ChunkBlock {
    pub fn to_world_block(&self, chunk_pos: &ChunkPos) -> WorldBlock {
        WorldBlock {
            block_type: self.block_type,
            extra_data: self.extra_data,
            world_pos: self.pos.to_world_pos(chunk_pos),
        }
    }
}

// Stuck in limbo https://github.com/rustwasm/wasm-bindgen/issues/2407
// #[wasm_bindgen]
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub enum BlockData {
    None,
    Image(Direction),
}

pub mod wasm {
    use wasm_bindgen::prelude::wasm_bindgen;

    use crate::direction::Direction;

    #[wasm_bindgen]
    pub struct ImageData {
        pub dir: Direction,
    }
}

#[wasm_bindgen]
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum BlockShape {
    Cube,
    X,
    Flat,
}

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub struct BlockMetaData {
    pub gravitable: bool,
    pub shape: BlockShape,
    pub transparent: bool,
    pub intangible: bool,
    pub fluid: bool,
}

// Define a default value for BlockMetaData
impl Default for &BlockMetaData {
    fn default() -> Self {
        &BlockMetaData {
            gravitable: false,
            intangible: false,
            fluid: false,
            shape: BlockShape::Cube,
            transparent: false,
        }
    }
}

impl BlockMetaData {
    pub fn get_for_type(block_type: BlockType) -> &'static BlockMetaData {
        let index = block_type as usize;
        if index < BLOCK_DATA.len() {
            &BLOCK_DATA[index]
        } else {
            &DEFAULT_BLOCK_DATA
        }
    }
}

#[wasm_bindgen]
impl BlockMetaData {
    pub fn get_for_type_wasm(block_type: BlockType) -> Option<BlockMetaData> {
        let index = block_type as usize;
        if index < BLOCK_DATA.len() {
            Some(BLOCK_DATA[index])
        } else {
            None
        }
    }
}

const DEFAULT_BLOCK_DATA: BlockMetaData = BlockMetaData {
    gravitable: false,
    intangible: false,
    fluid: false,
    shape: BlockShape::Cube,
    transparent: false,
};

const BLOCK_DATA: [BlockMetaData; 12] = [
    // BlockType::Void = 0
    BlockMetaData {
        gravitable: false,
        intangible: true,
        shape: BlockShape::Cube,
        transparent: true,
        fluid: false,
    },
    // BlockType::Stone = 1
    BlockMetaData {
        gravitable: false,
        intangible: false,
        shape: BlockShape::Cube,
        transparent: false,
        fluid: false,
    },
    // BlockType::Wood = 2
    BlockMetaData {
        gravitable: false,
        intangible: false,
        shape: BlockShape::Cube,
        fluid: false,
        transparent: false,
    },
    // BlockType::Leaf = 3
    BlockMetaData {
        gravitable: false,
        intangible: false,
        fluid: false,
        shape: BlockShape::Cube,
        transparent: true,
    },
    // BlockType::Cloud = 4
    BlockMetaData {
        gravitable: false,
        intangible: false,
        fluid: false,
        shape: BlockShape::Cube,
        transparent: false,
    },
    // BlockType::Gold = 5
    BlockMetaData {
        gravitable: false,
        intangible: false,
        fluid: false,
        shape: BlockShape::Cube,
        transparent: false,
    },
    // BlockType::RedFlower = 6
    BlockMetaData {
        gravitable: false,
        intangible: false,
        fluid: false,
        shape: BlockShape::X,
        transparent: true,
    },
    // BlockType::Water = 7
    BlockMetaData {
        gravitable: false,
        intangible: true,
        fluid: true,
        shape: BlockShape::Cube,
        transparent: false,
    },
    // BlockType::Grass = 8
    BlockMetaData {
        gravitable: false,
        intangible: false,
        shape: BlockShape::Cube,
        transparent: false,
        fluid: false,
    },
    // BlockType::Image = 9
    BlockMetaData {
        gravitable: false,
        intangible: false,
        shape: BlockShape::Flat,
        transparent: true,
        fluid: false,
    },
    // BlockType::Planks = 10
    BlockMetaData {
        gravitable: false,
        intangible: false,
        fluid: false,
        shape: BlockShape::Cube,
        transparent: false,
    },
    // BlockType::Red = 11
    BlockMetaData {
        gravitable: false,
        intangible: false,
        fluid: false,
        shape: BlockShape::Cube,
        transparent: false,
    },
];
