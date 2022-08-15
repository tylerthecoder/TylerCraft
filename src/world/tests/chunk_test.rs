use wasm_bindgen_test::*;
use world::{chunk::{Chunk, InnerChunkPos}, world::{WorldPos, ChunkPos, World}, block::{BlockType, BlockData}};


wasm_bindgen_test_configure!(run_in_browser);


#[wasm_bindgen_test]
fn stores_block() {
    let chunk_pos = ChunkPos::new(0, 0);
    let mut chunk = Chunk::new(chunk_pos);

    let inner_chunk_pos = InnerChunkPos::new(1, 0, 1);

    chunk.add_block(&inner_chunk_pos, BlockType::Cloud, BlockData::None);

    let block = chunk.get_block(&inner_chunk_pos);

    assert_eq!(block, BlockType::Cloud);
}

#[wasm_bindgen_test]
fn defaults_to_void() {
    let chunk_pos = ChunkPos::new(0, 0);
    let chunk = Chunk::new(chunk_pos);

    let inner_chunk_pos = InnerChunkPos::new(0, 1, 1);

    let block = chunk.get_block(&inner_chunk_pos);

    assert_eq!(block, BlockType::Void);
}

#[wasm_bindgen_test]
fn stores_first_block() {
    let chunk_pos = ChunkPos::new(0, 0);
    let mut chunk = Chunk::new(chunk_pos);

    let inner_chunk_pos = InnerChunkPos::new(0, 0, 0);

    chunk.add_block(&inner_chunk_pos, BlockType::Cloud, BlockData::None);

    let block = chunk.get_block(&inner_chunk_pos);

    assert_eq!(block, BlockType::Cloud);
}

#[wasm_bindgen_test]
fn stores_last_block() {
    let chunk_pos = ChunkPos::new(0, 0);
    let mut chunk = Chunk::new(chunk_pos);

    let inner_chunk_pos = InnerChunkPos::new(15, 63, 15);

    chunk.add_block(&inner_chunk_pos, BlockType::Cloud, BlockData::None);

    let block = chunk.get_block(&inner_chunk_pos);

    assert_eq!(block, BlockType::Cloud);
}

#[wasm_bindgen_test]
fn deletes_blocks() {
    let chunk_pos = ChunkPos::new(0, 0);
    let mut chunk = Chunk::new(chunk_pos);

    let inner_chunk_pos = InnerChunkPos::new(15, 63, 15);

    chunk.add_block(&inner_chunk_pos, BlockType::Cloud, BlockData::None);


    chunk.remove_block(&inner_chunk_pos);

    let block = chunk.get_block(&inner_chunk_pos);

    assert_eq!(block, BlockType::Void)
}


#[test]
fn calculate_visible_faces() {
    let mut world = World::new();

    world.add_chunk(&ChunkPos { x : 0, y : 0 });

    let chunk = world.get_chunk(&ChunkPos{ x : 0, y : 0 }).unwrap();


    // chunk.add_block(&InnerChunkPos { x: 1, y: 1, z: 1 }, BlockType::Cloud, BlockData::None);







    // let faces = chunk.calculate_visible_faces(&world);




}
