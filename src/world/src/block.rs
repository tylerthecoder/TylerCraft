use crate::direction::{create_directions, Direction, Directions, ALL_DIRECTIONS};
use crate::world::{World, WorldPos};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serde_repr::{Deserialize_repr, Serialize_repr};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

trait BlockTrait {
    fn get_visible_faces() -> Directions;
}

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
}

#[wasm_bindgen]
pub struct WasmBlock {
    pub block_type: BlockType,
    pub extra_data: Option<WasmImageData>,
}

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub struct WasmImageData {
    pub dir: Direction,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorldBlock {
    pub block_type: BlockType,
    pub extra_data: BlockData,
    pub world_pos: WorldPos,
}

impl WorldBlock {
    pub fn empty(world_pos: WorldPos) -> WorldBlock {
        WorldBlock {
            block_type: BlockType::Void,
            extra_data: BlockData::None,
            world_pos,
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

#[derive(Clone, Copy)]
pub struct BlockMetaData {
    pub gravitable: bool,
    pub shape: BlockShape,
    pub transparent: bool,
    pub intangible: bool,
    pub fluid: bool,
}

lazy_static! {
    static ref BLOCK_DATA: HashMap<BlockType, BlockMetaData> = {
        let mut map: HashMap<BlockType, BlockMetaData> = HashMap::new();
        map.insert(
            BlockType::Void,
            BlockMetaData {
                gravitable: false,
                intangible: false,
                shape: BlockShape::Cube,
                transparent: true,
                fluid: false,
            },
        );
        map.insert(
            BlockType::Image,
            BlockMetaData {
                gravitable: false,
                intangible: false,
                shape: BlockShape::Flat,
                transparent: true,
                fluid: false,
            },
        );
        map.insert(
            BlockType::Grass,
            BlockMetaData {
                gravitable: false,
                intangible: false,
                shape: BlockShape::Cube,
                transparent: false,
                fluid: false,
            },
        );
        map.insert(
            BlockType::Wood,
            BlockMetaData {
                gravitable: false,
                intangible: false,
                shape: BlockShape::Cube,
                fluid: false,
                transparent: false,
            },
        );
        map.insert(
            BlockType::Leaf,
            BlockMetaData {
                gravitable: false,
                intangible: false,
                fluid: false,
                shape: BlockShape::Cube,
                transparent: true,
            },
        );
        map.insert(
            BlockType::Cloud,
            BlockMetaData {
                gravitable: false,
                intangible: false,
                fluid: false,
                shape: BlockShape::Cube,
                transparent: false,
            },
        );
        map.insert(
            BlockType::Gold,
            BlockMetaData {
                gravitable: false,
                intangible: false,
                fluid: false,
                shape: BlockShape::Cube,
                transparent: false,
            },
        );
        map.insert(
            BlockType::RedFlower,
            BlockMetaData {
                gravitable: false,
                intangible: false,
                fluid: false,
                shape: BlockShape::X,
                transparent: true,
            },
        );
        map.insert(
            BlockType::Water,
            BlockMetaData {
                gravitable: false,
                intangible: false,
                fluid: false,
                shape: BlockShape::Cube,
                transparent: true,
            },
        );
        map.insert(
            BlockType::RedFlower,
            BlockMetaData {
                gravitable: false,
                intangible: false,
                fluid: false,
                shape: BlockShape::X,
                transparent: true,
            },
        );

        map
    };
}

pub fn get_block_data(block_type: BlockType) -> &'static BlockMetaData {
    BLOCK_DATA.get(&block_type).unwrap_or(&BlockMetaData {
        gravitable: false,
        intangible: false,
        fluid: false,
        shape: BlockShape::Cube,
        transparent: false,
    })
}

pub fn get_visible_faces(block: &WorldBlock, world: &World) -> Directions {
    let mut faces = cube_faces(block);
    for i in 0..5 {
        let current = faces[i];
        if !current {
            continue;
        }
        let direction = Direction::from_index(i);
        let is_face_shown = is_block_face_visible(block, world, direction);

        if !is_face_shown {
            faces[i] = false;
        }
    }

    faces
}

pub fn cube_faces(world_block: &WorldBlock) -> Directions {
    let block_data = get_block_data(world_block.block_type);

    match block_data.shape {
        BlockShape::Cube => ALL_DIRECTIONS,
        BlockShape::X => ALL_DIRECTIONS,
        BlockShape::Flat => match world_block.extra_data {
            BlockData::Image(direction) => create_directions(direction),
            _ => ALL_DIRECTIONS,
        },
    }
}

pub fn is_block_face_visible(
    world_block: &WorldBlock,
    world: &World,
    direction: Direction,
) -> bool {
    let new_block_pos = world_block.world_pos.move_direction(&direction);
    let new_block = world.get_block(&new_block_pos);

    // We now assume there is always a block
    // There isn't a block, so we should show the face
    // if new_block.is_none() {
    // 	return true;
    // }

    // let new_block = new_block.unwrap();

    if new_block.block_type == BlockType::Void {
        return true;
    }

    let block_data = get_block_data(world_block.block_type);
    let new_block_data = get_block_data(new_block.block_type);

    if block_data.fluid && new_block_data.fluid {
        println!("They were both fluids");
        return true;
    }

    // Don't think this is needed because the cube faces
    // Return false for every face except the one the image is on
    // if let BlockData::Image(image_direction) = new_block.extra_data {
    // 	if image_direction != direction {
    // 		return false;
    // 	}
    // }

    println!("Don't show");

    return false;
}
