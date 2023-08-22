mod utils;
use noise::{NoiseFn, Perlin};
use wasm_bindgen::prelude::*;
use world::{
    block::{self, BlockType, ChunkBlock},
    chunk::{Chunk, CHUNK_WIDTH},
    positions::{ChunkPos, InnerChunkPos},
};

#[wasm_bindgen]
pub fn get_chunk_wasm(chunk_x: i16, chunk_y: i16) -> Chunk {
    let seed = 100;
    let jag_factor = 1.0 / 100.0;
    let height_multiplier = 10.0;

    let noise = Perlin::new(seed);

    let mut chunk = Chunk::new(ChunkPos {
        x: chunk_x,
        y: chunk_y,
    });

    for x in 0u8..CHUNK_WIDTH as u8 {
        for z in 0u8..CHUNK_WIDTH as u8 {
            let world_x = (chunk_x * CHUNK_WIDTH as i16) as f64 + (x as f64);
            let world_z = (chunk_y * CHUNK_WIDTH as i16) as f64 + (z as f64);

            let per_val = noise.get([world_x * jag_factor, world_z * jag_factor]);
            let height = ((per_val.abs() * height_multiplier) + 5.0) as u8;

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
