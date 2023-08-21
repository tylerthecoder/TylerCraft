mod utils;
use noise::{NoiseFn, Perlin, Worley};
use wasm_bindgen::prelude::*;
use world::{
    block::{self, BlockType, ChunkBlock},
    chunk::{Chunk, CHUNK_WIDTH},
    positions::{ChunkPos, InnerChunkPos},
};

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet() {
    alert("Hello, terrain-gen!");
}

#[wasm_bindgen]
pub fn get_chunk() -> Chunk {
    let mut chunk = Chunk::new(ChunkPos::new(0, 0));

    for x in 0u8..CHUNK_WIDTH as u8 {
        for z in 0u8..CHUNK_WIDTH as u8 {
            // determine the height of world using perlin noise

            let perlin = Worley::new(100);
            let per_val: f64 = perlin.get([x as f64, z as f64]);
            let height: u8 = ((per_val.abs() * 10.0) + 5.0) as u8;
            use web_sys::console;

            console::log_1(&format!("height: {}", height).into());

            for y in 0u8..height {
                let block = ChunkBlock {
                    pos: InnerChunkPos::new(x, y, z),
                    block_type: BlockType::Stone,
                    extra_data: block::BlockData::None,
                };

                chunk.add_block(block);
            }
            // add top grass block
            let block = ChunkBlock {
                pos: InnerChunkPos::new(x, height, z),
                block_type: BlockType::Grass,
                extra_data: block::BlockData::None,
            };
            chunk.add_block(block);
        }
    }

    chunk
}
