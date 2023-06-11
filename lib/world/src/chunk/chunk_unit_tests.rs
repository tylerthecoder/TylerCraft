use super::{Chunk, ChunkPos, InnerChunkPos};
use crate::{
    block::{BlockData, BlockType},
    chunk::ChunkBlock,
    world::World,
};

#[test]
fn gets_all_blocks() {
    let mut world = World::default();
    let chunk_pos = ChunkPos { x: -2, y: -3 };
    let mut chunk = Chunk::new(chunk_pos);

    chunk.add_block(ChunkBlock {
        pos: InnerChunkPos::new(0, 0, 0),
        block_type: BlockType::Cloud,
        extra_data: BlockData::None,
    });

    chunk.add_block(ChunkBlock {
        pos: InnerChunkPos::new(1, 2, 3),
        block_type: BlockType::Stone,
        extra_data: BlockData::None,
    });

    chunk.add_block(ChunkBlock {
        pos: InnerChunkPos::new(15, 0, 15),
        block_type: BlockType::Stone,
        extra_data: BlockData::None,
    });

    world.insert_chunk(chunk);

    let chunk = world.get_chunk(&chunk_pos).unwrap();

    chunk
        .get_all_blocks()
        .iter()
        .map(|block| block.to_world_block(&chunk_pos.to_owned()))
        .for_each(|world_block| {
            let true_world_block = world.get_block(&world_block.world_pos);
            assert_eq!(world_block, true_world_block);
        });
}

#[test]
fn stores_block() {
    let chunk_pos = ChunkPos::new(0, 0);
    let mut chunk = Chunk::new(chunk_pos);

    let inner_chunk_pos = InnerChunkPos::new(1, 0, 1);

    let block = ChunkBlock {
        pos: inner_chunk_pos,
        block_type: BlockType::Cloud,
        extra_data: BlockData::None,
    };

    chunk.add_block(block);

    let got_block = chunk.get_block(&inner_chunk_pos);

    assert_eq!(block, got_block);
}

#[test]
fn defaults_to_void() {
    let chunk_pos = ChunkPos::new(0, 0);
    let chunk = Chunk::new(chunk_pos);

    let inner_chunk_pos = InnerChunkPos::new(0, 1, 1);

    let block = chunk.get_block_type(&inner_chunk_pos);

    assert_eq!(block, BlockType::Void);
}

#[test]
fn stores_first_block() {
    let chunk_pos = ChunkPos::new(0, 0);
    let mut chunk = Chunk::new(chunk_pos);

    let inner_chunk_pos = InnerChunkPos::new(0, 0, 0);

    chunk.add_block(ChunkBlock {
        pos: inner_chunk_pos,
        block_type: BlockType::Cloud,
        extra_data: BlockData::None,
    });

    let block = chunk.get_block_type(&inner_chunk_pos);

    assert_eq!(block, BlockType::Cloud);
}

#[test]
fn stores_last_block() {
    let chunk_pos = ChunkPos::new(0, 0);
    let mut chunk = Chunk::new(chunk_pos);

    let inner_chunk_pos = InnerChunkPos::new(15, 63, 15);

    chunk.add_block(ChunkBlock {
        pos: inner_chunk_pos,
        block_type: BlockType::Cloud,
        extra_data: BlockData::None,
    });

    let block = chunk.get_block_type(&inner_chunk_pos);

    assert_eq!(block, BlockType::Cloud);
}

#[test]
fn deletes_blocks() {
    let chunk_pos = ChunkPos::new(0, 0);
    let mut chunk = Chunk::new(chunk_pos);

    let inner_chunk_pos = InnerChunkPos::new(15, 63, 15);

    chunk.add_block(ChunkBlock {
        pos: inner_chunk_pos,
        block_type: BlockType::Cloud,
        extra_data: BlockData::None,
    });

    chunk.remove_block(&inner_chunk_pos);

    let block = chunk.get_block_type(&inner_chunk_pos);

    assert_eq!(block, BlockType::Void)
}
