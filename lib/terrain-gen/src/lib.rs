mod utils;
use wasm_bindgen::prelude::*;
use world::{block::{self, ChunkBlock, BlockType}, chunk::{Chunk, CHUNK_WIDTH}, positions::{ChunkPos, InnerChunkPos}};

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet() {
    alert("Hello, terrain-gen!");
}


// GOAL: create a chunk 4 tall with grass on top and stone below
#[wasm_bindgen]
pub fn get_chunk() -> Chunk {
    let mut chunk = Chunk::new(
        ChunkPos::new(0, 0),
    );

    for x in 0u8..CHUNK_WIDTH as u8 {
        for z in 0u8..CHUNK_WIDTH as u8 {
            for y in 0u8..3 {
                let block = ChunkBlock {
                    pos: InnerChunkPos::new(x, y, z),
                    block_type: BlockType::Stone,
                    extra_data: block::BlockData::None,
                };

                chunk.add_block(block);
            }
            // add top grass block
            let block = ChunkBlock {
                pos: InnerChunkPos::new(x, 3, z),
                block_type: BlockType::Grass,
                extra_data: block::BlockData::None,
            };
            chunk.add_block(block);
        }
    }

    chunk
}




