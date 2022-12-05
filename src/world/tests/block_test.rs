use wasm_bindgen_test::*;
use world::{
    block::{is_block_face_visible, BlockData, BlockType},
    chunk::Chunk,
    direction::Direction,
    world::{ChunkPos, World, WorldPos},
};

#[wasm_bindgen_test]
#[test]
fn gets_visible_faces() {
    let mut world = World::new();
    let world_pos = WorldPos::new(0, 0, 0);
    let other_world_pos = WorldPos::new(1, 0, 0);
    let chunk = Chunk::new(ChunkPos::new(0, 0));

    world.insert_chunk(chunk);

    world
        .add_block(&world_pos, BlockType::Cloud, BlockData::None)
        .unwrap();
    world
        .add_block(&other_world_pos, BlockType::Cloud, BlockData::None)
        .unwrap();

    let block = world.get_block(&world_pos);

    let is_visible = is_block_face_visible(&block, &world, Direction::East);

    assert_eq!(is_visible, false);

    let is_visible_2 = is_block_face_visible(&block, &world, Direction::West);

    assert_eq!(is_visible_2, true);
}

wasm_bindgen_test_configure!(run_in_browser);
