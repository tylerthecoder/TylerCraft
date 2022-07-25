mod utils;

use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;



const CHUNK_WIDTH: usize = 16;
const CHUNK_HEIGHT: usize = 16;
const CHUNK_MEM_SIZE: usize = CHUNK_HEIGHT * CHUNK_WIDTH * CHUNK_WIDTH;

#[wasm_bindgen]
pub struct Chunk {
    blocks: [u32; CHUNK_MEM_SIZE]
}

#[wasm_bindgen]
impl Chunk {
    fn pos_to_index(x: u8, y: u8, z: u8) -> usize {
        let x_part = (x as usize) << (4+8);
        let y_part = (y as usize) << 4;
        let z_part = z as usize;
        x_part + y_part + z_part
    }

    pub fn new() -> Chunk {
        Chunk {
            blocks: [0; CHUNK_MEM_SIZE]
        }
    }

    pub fn add_block(&mut self, x: u8, y: u8, z: u8, block: u32) {
        let index = Self::pos_to_index(x, y, z);
        self.blocks[index] = block
    }

    pub fn get_block(&self, x: u8, y: u8, z: u8) -> u32 {
        let index = Self::pos_to_index(x, y, z);
        self.blocks[index]
    }
}




