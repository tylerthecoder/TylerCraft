use super::{Chunk, ChunkPos, InnerChunkPos};
use crate::{
    block::{BlockData, BlockType},
    world::{World, WorldPos},
};

#[test]
fn index_conversion() {
    let index = Chunk::pos_to_index(&InnerChunkPos::new(1, 2, 3));
    assert_eq!(index, 1024 + 32 + 3);
    let pos = Chunk::index_to_pos(index);
    assert_eq!(pos, InnerChunkPos::new(1, 2, 3));

    let index = Chunk::pos_to_index(&InnerChunkPos::new(0, 0, 0));
    let pos = Chunk::index_to_pos(index);
    assert_eq!(pos, InnerChunkPos::new(0, 0, 0));
}

#[test]
fn conversion() {
    let inner_chunk_pos = InnerChunkPos::new(1, 2, 3);
    let chunk = Chunk::new(ChunkPos { x: 0, y: 0 });

    let world_pos = chunk.chunk_pos_to_world_pos(&inner_chunk_pos);

    assert_eq!(world_pos, WorldPos { x: 1, y: 2, z: 3 });
}

#[test]
fn chunk_pos_to_world_pos() {
    let chunk_pos = ChunkPos { x: 1, y: 1 };
    let chunk = Chunk::new(chunk_pos);
    let inner_chunk_pos = InnerChunkPos::new(1, 2, 3);
    let world_pos = chunk.chunk_pos_to_world_pos(&inner_chunk_pos);

    assert_eq!(world_pos, WorldPos { x: 17, y: 2, z: 19 });

    let chunk_pos = ChunkPos { x: -1, y: -1 };
    let chunk = Chunk::new(chunk_pos);
    let inner_chunk_pos = InnerChunkPos::new(1, 2, 3);
    let world_pos = chunk.chunk_pos_to_world_pos(&inner_chunk_pos);
    assert_eq!(
        world_pos,
        WorldPos {
            x: -15,
            y: 2,
            z: -13
        }
    );
}

#[test]
fn calculate_visible_faces() {
    // Make a world
    let mut world = World::new();

    // Make a chunk
    let mut chunk = Chunk::new(ChunkPos { x: 0, y: 0 });

    chunk.add_block(
        &InnerChunkPos::new(0, 0, 0),
        BlockType::Cloud,
        BlockData::None,
    );

    chunk.calculate_visible_faces(&world);

    world.insert_chunk(chunk);

    let chunk = world.get_chunk(&ChunkPos { x: 0, y: 0 }).unwrap();

    assert_eq!(chunk.visible_faces.len(), 1);

    let block_with_faces = chunk.visible_faces.get(0).unwrap();

    assert_eq!(block_with_faces.faces.len(), 6);

    let block = world.get_block(&block_with_faces.world_pos);

    assert_eq!(block.block_type, BlockType::Cloud);
}

#[test]
fn stores_block() {
    let chunk_pos = ChunkPos::new(0, 0);
    let mut chunk = Chunk::new(chunk_pos);

    let inner_chunk_pos = InnerChunkPos::new(1, 0, 1);

    chunk.add_block(&inner_chunk_pos, BlockType::Cloud, BlockData::None);

    let block = chunk.get_block(&inner_chunk_pos);

    assert_eq!(block, BlockType::Cloud);
}

#[test]
fn defaults_to_void() {
    let chunk_pos = ChunkPos::new(0, 0);
    let chunk = Chunk::new(chunk_pos);

    let inner_chunk_pos = InnerChunkPos::new(0, 1, 1);

    let block = chunk.get_block(&inner_chunk_pos);

    assert_eq!(block, BlockType::Void);
}

#[test]
fn stores_first_block() {
    let chunk_pos = ChunkPos::new(0, 0);
    let mut chunk = Chunk::new(chunk_pos);

    let inner_chunk_pos = InnerChunkPos::new(0, 0, 0);

    chunk.add_block(&inner_chunk_pos, BlockType::Cloud, BlockData::None);

    let block = chunk.get_block(&inner_chunk_pos);

    assert_eq!(block, BlockType::Cloud);
}

#[test]
fn stores_last_block() {
    let chunk_pos = ChunkPos::new(0, 0);
    let mut chunk = Chunk::new(chunk_pos);

    let inner_chunk_pos = InnerChunkPos::new(15, 63, 15);

    chunk.add_block(&inner_chunk_pos, BlockType::Cloud, BlockData::None);

    let block = chunk.get_block(&inner_chunk_pos);

    assert_eq!(block, BlockType::Cloud);
}

#[test]
fn deletes_blocks() {
    let chunk_pos = ChunkPos::new(0, 0);
    let mut chunk = Chunk::new(chunk_pos);

    let inner_chunk_pos = InnerChunkPos::new(15, 63, 15);

    chunk.add_block(&inner_chunk_pos, BlockType::Cloud, BlockData::None);

    chunk.remove_block(&inner_chunk_pos);

    let block = chunk.get_block(&inner_chunk_pos);

    assert_eq!(block, BlockType::Void)
}
