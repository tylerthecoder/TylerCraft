mod utils;

use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;



const CHUNK_WIDTH: usize = 16;
const CHUNK_HEIGHT: usize = 64;
const CHUNK_MEM_SIZE: usize = CHUNK_HEIGHT * CHUNK_WIDTH * CHUNK_WIDTH;

#[wasm_bindgen]
pub struct Chunk {
    blocks: [u16; CHUNK_MEM_SIZE]
}

pub struct Pos {
    x: u8,
    y: u8,
    z: u8,
}

#[wasm_bindgen]
pub struct Block {
    pos: Pos,
    block: u32,
}

#[wasm_bindgen]
extern "C" {
    // Use `js_namespace` here to bind `console.log(..)` instead of just
    // `log(..)`
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    // The `console.log` is quite polymorphic, so we can bind it with multiple
    // signatures. Note that we need to use `js_name` to ensure we always call
    // `log` in JS.
    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_u32(a: usize);

    // Multiple arguments too!
    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_many(a: &str, b: &str);
}

#[wasm_bindgen]
impl Chunk {
    fn pos_to_index(x: u8, y: u8, z: u8) -> usize {
        let x_part = (x as usize) << (4+6);
        let y_part = (y as usize) << 4;
        let z_part = z as usize;
        x_part + y_part + z_part
    }

    pub fn new() -> Chunk {
        Chunk {
            blocks: [0; CHUNK_MEM_SIZE]
        }
    }

    pub fn add_block(&mut self, x: u8, y: u8, z: u8, block: u16) {
        let index = Self::pos_to_index(x, y, z);
        self.blocks[index] = block
    }

    pub fn get_block(&self, x: u8, y: u8, z: u8) -> u16 {
        let index = Self::pos_to_index(x, y, z);
        self.blocks[index]
    }

    pub fn remove_block(&mut self, x: u8, y: u8, z: u8) -> () {
        let index = Self::pos_to_index(x, y, z);
        self.blocks[index] = 0;
    }

}




