use crate::{
    block::{BlockData, BlockType},
    chunk::{Chunk, InnerChunkPos},
    world::{ChunkPos, World, WorldPos},
};

#[test]
fn world_pos_to_chunk_pos() {
    let chunk_pos = World::world_pos_to_chunk_pos(&WorldPos { x: 1, y: 2, z: 3 });

    assert_eq!(chunk_pos, ChunkPos { x: 0, y: 0 });

    let chunk_pos = World::world_pos_to_chunk_pos(&WorldPos { x: 0, y: 0, z: 0 });

    assert_eq!(chunk_pos, ChunkPos { x: 0, y: 0 });

    let chunk_pos = World::world_pos_to_chunk_pos(&WorldPos { x: -1, y: 0, z: -1 });

    assert_eq!(chunk_pos, ChunkPos { x: -1, y: -1 });

    let chunk_pos = World::world_pos_to_chunk_pos(&WorldPos {
        x: -16,
        y: 0,
        z: -16,
    });

    assert_eq!(chunk_pos, ChunkPos { x: -1, y: -1 });

    let chunk_pos = World::world_pos_to_chunk_pos(&WorldPos { x: 16, y: 0, z: 0 });

    assert_eq!(chunk_pos, ChunkPos { x: 1, y: 0 });

    let chunk_pos = World::world_pos_to_chunk_pos(&WorldPos { x: 0, y: 0, z: -1 });

    assert_eq!(chunk_pos, ChunkPos { x: 0, y: -1 });
}

#[test]
fn world_pos_to_inner_chunk_pos() {
    let chunk_pos = World::world_pos_to_inner_chunk_pos(&WorldPos { x: 1, y: 2, z: 3 });

    assert_eq!(chunk_pos, InnerChunkPos { x: 1, y: 2, z: 3 });

    let chunk_pos = World::world_pos_to_inner_chunk_pos(&WorldPos { x: -1, y: 0, z: 1 });

    assert_eq!(chunk_pos, InnerChunkPos { x: 15, y: 0, z: 1 });

    let chunk_pos = World::world_pos_to_inner_chunk_pos(&WorldPos { x: -1, y: 0, z: -1 });

    assert_eq!(chunk_pos, InnerChunkPos { x: 15, y: 0, z: 15 });

    let chunk_pos = World::world_pos_to_inner_chunk_pos(&WorldPos {
        x: -32,
        y: 20,
        z: 0,
    });

    assert_eq!(chunk_pos, InnerChunkPos { x: 0, y: 20, z: 0 });
}

#[test]
fn world_pos_conversions() {
    let world_pos = WorldPos::new(2, 3, 4);
    let chunk_pos = World::world_pos_to_chunk_pos(&world_pos);

    assert_eq!(chunk_pos.x, 0);
    assert_eq!(chunk_pos.y, 0);
}

#[test]
fn adds_chunks() {
    let mut world = World::new();

    let chunk_pos = ChunkPos::new(0, 0);
    let inner_chunk_pos = InnerChunkPos::new(0, 0, 1);

    let mut chunk = Chunk::new(chunk_pos);

    chunk.add_block(&inner_chunk_pos, BlockType::Cloud, BlockData::None);

    world.insert_chunk(chunk);

    let same_chunk = world.get_chunk(&chunk_pos).unwrap();

    let same_block = same_chunk.get_block_type(&inner_chunk_pos);

    assert_eq!(same_block, BlockType::Cloud);
}

#[test]
fn adds_blocks() {
    let mut world = World::new();

    let block_pos = WorldPos::new(0, 0, 0);

    let chunk = Chunk::new(ChunkPos { x: 0, y: 0 });

    // In the first chunk
    world.insert_chunk(chunk);

    world
        .add_block(&block_pos, BlockType::Cloud, BlockData::None)
        .unwrap();

    let block = world.get_block(&block_pos);

    assert_eq!(block.block_type, BlockType::Cloud);
    assert_eq!(block.extra_data, BlockData::None);

    // In a different chunk
    let chunk2 = Chunk::new(ChunkPos { x: 1, y: 0 });
    let block_pos = WorldPos::new(16, 0, 0);

    world.insert_chunk(chunk2);

    world
        .add_block(&block_pos, BlockType::Gold, BlockData::None)
        .unwrap();

    let block = world.get_block(&block_pos);

    assert_eq!(block.block_type, BlockType::Gold);
    assert_eq!(block.extra_data, BlockData::None);
}
