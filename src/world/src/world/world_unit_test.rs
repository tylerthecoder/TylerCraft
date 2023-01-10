use crate::{
    block::{BlockData, BlockType, WorldBlock},
    chunk::Chunk,
    world::{ChunkPos, World, WorldPos},
};

#[test]
fn adds_blocks() {
    let mut world = World::default();

    let block_pos = WorldPos::new(0, 0, 0);

    let chunk = Chunk::new(ChunkPos { x: 0, y: 0 });

    // In the first chunk
    world.insert_chunk(chunk);

    let world_block = WorldBlock {
        block_type: BlockType::Cloud,
        extra_data: BlockData::None,
        world_pos: block_pos,
    };

    world.add_block(&world_block).unwrap();

    let block = world.get_block(&block_pos);

    assert_eq!(block.block_type, BlockType::Cloud);
    assert_eq!(block.extra_data, BlockData::None);

    // In a different chunk
    let chunk2 = Chunk::new(ChunkPos { x: 1, y: 0 });
    let block_pos = WorldPos::new(16, 0, 0);

    let world_block = WorldBlock {
        block_type: BlockType::Gold,
        extra_data: BlockData::None,
        world_pos: block_pos,
    };

    world.insert_chunk(chunk2);

    world.add_block(&world_block).unwrap();

    let block = world.get_block(&block_pos);

    assert_eq!(block.block_type, BlockType::Gold);
    assert_eq!(block.extra_data, BlockData::None);
}
