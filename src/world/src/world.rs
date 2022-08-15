
use wasm_bindgen::prelude::*;
use crate::block::wasm::ImageData;
use crate::vec::{Vec3, Vec2};
use std;
use std::collections::HashMap;
use crate::chunk::*;
use crate::block::{BlockType, BlockData, WorldBlock};


pub type WorldPos = Vec3<i32>;
pub type ChunkPos = Vec2<i16>;


#[wasm_bindgen]
pub struct WorldPosWasm {
	pub x: i32,
	pub y: i32,
	pub z: i32,
}


#[wasm_bindgen]
pub struct World {
	chunks: HashMap<i32, Chunk>
}

// WASM public methods

#[wasm_bindgen]
impl World {
	pub fn new_wasm() -> World {
		World {
			chunks: HashMap::new()
		}
	}

	pub fn add_block_wasm(&mut self, block_world_pos: WorldPosWasm, block: BlockType, block_data: ImageData) {
		let block_world_pos = WorldPos {
			x: block_world_pos.x,
			y: block_world_pos.y,
			z: block_world_pos.z,
		};

		let data = if let ImageData { dir } = block_data {
			BlockData::Image(dir)
		} else {
				BlockData::None
		};

		self.add_block(&block_world_pos, block, data);
	}
}


impl World {

	pub fn new() -> World {
		World {
			chunks: HashMap::new()
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

	fn world_pos_to_inner_chunk_pos(world_pos: &WorldPos) -> InnerChunkPos {
		let x = ((world_pos.x as i8 % 16) + 16) % 16;
		let y = world_pos.y as i8;
		let z = ((world_pos.z as i8 % 16) + 16) % 16;
		InnerChunkPos::new(x, y, z)
	}

	pub fn world_pos_to_chunk_pos(world_pos: &WorldPos) -> ChunkPos {
		let x = world_pos.x / CHUNK_WIDTH as i32;
		let y = world_pos.z / CHUNK_WIDTH as i32;
		ChunkPos { x: x as i16, y: y as i16 }
	}


	// fn parse_index(index: &str) -> Vec3<i32> {
	// 	let mut split = index.split(":");
	// 	let x = split.next().unwrap().parse::<usize>().unwrap();
	// 	let y = split.next().unwrap().parse::<usize>().unwrap();
	// 	let z = split.next().unwrap().parse::<usize>().unwrap();
	// 	Vec3::new(x as i32, y as i32, z as i32)
	// }

	pub fn get_chunk(&self, chunk_pos: &ChunkPos) -> Option<& Chunk> {
		let index = Self::make_chunk_pos_index(chunk_pos);
		self.chunks.get(&index)
	}

	pub fn get_mut_chunk(&mut self, chunk_pos: &ChunkPos) -> Option<&mut Chunk> {
		let index = Self::make_chunk_pos_index(chunk_pos);
		self.chunks.get_mut(&index)
	}

	pub fn add_chunk(&mut self, chunk_pos: &ChunkPos) -> &mut Chunk {
		let chunk = Chunk::new(*chunk_pos);
		let index = Self::make_chunk_pos_index(chunk_pos);
		self.chunks.insert(index.to_owned(), chunk);
		self.chunks.get_mut(&index.to_owned()).unwrap()
	}

	pub fn add_block(&mut self, block_world_pos: &WorldPos, block: BlockType, block_data: BlockData) {
		let block_chunk_pos = Self::world_pos_to_chunk_pos(block_world_pos);
		let chunk = self.get_mut_chunk(&block_chunk_pos);

		match chunk {
			Some(x) => {
				let chunk_internal_pos = Self::world_pos_to_inner_chunk_pos(block_world_pos);
				x.add_block(&chunk_internal_pos, block, block_data);
			}
			None => ()
		}
	}

	pub fn get_block(&self, block_world_pos: &WorldPos) -> Option<WorldBlock> {
		let chunk_pos = Self::world_pos_to_chunk_pos(block_world_pos);
		println!("Chunk Pos {:?}", chunk_pos);
		let chunk = self.get_chunk(&chunk_pos);

		match chunk {
			Some(x) => {
				let chunk_internal_pos = Self::world_pos_to_inner_chunk_pos(block_world_pos);
				println!("Chunk internal {:?}", chunk_internal_pos);
				let block = x.get_full_block(&chunk_internal_pos);

				Some(block)
			}
			None => None
		}
	}
}


mod tests {
    use crate::{world::ChunkPos, chunk::InnerChunkPos};

    use super::{World, WorldPos};



		#[test]
	fn world_pos_to_chunk_pos() {
		let chunk_pos = World::world_pos_to_chunk_pos(&WorldPos { x: 1, y: 2, z: 3 });

		assert_eq!(chunk_pos, ChunkPos { x: 0, y: 0 });
	}

		#[test]
	fn world_pos_to_inner_chunk_pos() {
		let chunk_pos = World::world_pos_to_inner_chunk_pos(&WorldPos { x: 1, y: 2, z: 3 });

		assert_eq!(chunk_pos, InnerChunkPos { x: 1, y: 2, z: 3 });
	}



}