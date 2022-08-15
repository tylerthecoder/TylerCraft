use wasm_bindgen::prelude::*;
use std::collections::HashMap;
use std::format;
use lazy_static::lazy_static;
use crate::direction::{Directions, ALL_DIRECTIONS, Direction, create_directions};
use crate::world::{World, WorldPos};

trait BlockTrait {
	fn get_visible_faces() -> Directions;
}


#[wasm_bindgen]
#[derive(Eq, Hash, PartialEq, Clone, Copy, Debug)]
pub enum BlockType {
	Void,
	Stone,
	Wood,
	Leaf,
	Cloud,
	Gold,
	RedFlower,
	Water,
	Grass,
	Image
}

#[derive(Debug)]
pub struct Block {
	pub block_type: BlockType,
	pub extra_data: BlockData,
}

#[derive(Debug)]
pub struct WorldBlock {
	pub block: Block,
	pub world_pos: WorldPos,
}

// Stuck in limbo https://github.com/rustwasm/wasm-bindgen/issues/2407
// #[wasm_bindgen]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
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
	Flat
}

#[derive(Clone, Copy)]
pub struct BlockMetaData {
  gravitable: bool,
  shape: BlockShape,
  transparent: bool,
  intangible: bool,
	fluid: bool,
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
					}
				);
				map.insert(
					BlockType::Image,
					BlockMetaData {
						gravitable: false,
						intangible: false,
						shape: BlockShape::Flat,
						transparent: true,
						fluid: false,
					}
				);
				map.insert(
					BlockType::Grass,
					BlockMetaData {
						gravitable: false,
						intangible: false,
						shape: BlockShape::Cube,
						transparent: false,
						fluid: false,
					}
				);
				map.insert(
					BlockType::Wood,
					BlockMetaData {
						gravitable: false,
						intangible: false,
						shape: BlockShape::Cube,
						fluid: false,
						transparent: false
					}
				);
				map.insert(
					BlockType::Leaf,
					BlockMetaData {
						gravitable: false,
						intangible: false,
						fluid: false,
						shape: BlockShape::Cube,
						transparent: true
					}
				);
				map.insert(
					BlockType::Cloud,
					BlockMetaData {
						gravitable: false,
						intangible: false,
						fluid: false,
						shape: BlockShape::Cube,
						transparent: false
					}
				);
				map.insert(
					BlockType::Gold,
					BlockMetaData {
						gravitable: false,
						intangible: false,
						fluid: false,
						shape: BlockShape::Cube,
						transparent: false
					}
				);
				map.insert(
					BlockType::RedFlower,
					BlockMetaData {
						gravitable: false,
						intangible: false,
						fluid: false,
						shape: BlockShape::X,
						transparent: true
					}
				);
				map.insert(
					BlockType::Water,
					BlockMetaData {
						gravitable: false,
						intangible: false,
						fluid: false,
						shape: BlockShape::Cube,
						transparent: true
					}
				);
				map.insert(
					BlockType::RedFlower,
					BlockMetaData {
						gravitable: false,
						intangible: false,
						fluid: false,
						shape: BlockShape::X,
						transparent: true
					}
				);

        map
    };
}


pub fn get_block_data(block_type: BlockType) -> &'static BlockMetaData {
	BLOCK_DATA.get(&block_type).unwrap()
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
	let block_data = BLOCK_DATA.get(&world_block.block.block_type).unwrap();

	match block_data.shape {
		BlockShape::Cube => ALL_DIRECTIONS,
		BlockShape::X => ALL_DIRECTIONS,
		BlockShape::Flat => {
			match world_block.block.extra_data {
				BlockData::Image(direction) => {
					create_directions(direction)
				}
				_ => ALL_DIRECTIONS
			}
		}
	}
}

pub fn is_block_face_visible(world_block: &WorldBlock, world: &World, direction: Direction) -> bool {
	let new_block_pos = world_block.world_pos.move_direction(&direction);
	let new_block = world.get_block(&new_block_pos);


	// There isn't a block, so we should show the face
	if new_block.is_none() {
		return true;
	}

	let new_block = new_block.unwrap();

	if new_block.block.block_type == BlockType::Void {
		return true;
	}

	println!("{:?}", new_block_pos);
	println!("{:?}", new_block);

	let block_data = get_block_data(world_block.block.block_type);
	let new_block_data = get_block_data(new_block.block.block_type);

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


