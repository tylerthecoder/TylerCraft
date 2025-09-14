use super::{chunk::Chunk, chunk_pos::ChunkPos, inner_chunk_pos::InnerChunkPos};
use crate::{
    block::{BlockData, BlockType, ChunkBlock},
    components::world_pos::WorldPos,
    geometry::vec::Vector3Ops,
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

#[test]
fn index_conversion() {
    fn do_test(index: usize, inner_chunk_pos: InnerChunkPos) -> () {
        assert_eq!(inner_chunk_pos.to_chunk_index(), index);
        assert_eq!(InnerChunkPos::make_from_chunk_index(index), inner_chunk_pos);
    }

    do_test(1024 + 32 + 3, InnerChunkPos::new(1, 2, 3));
    do_test(0, InnerChunkPos::new(0, 0, 0));
}

#[test]
fn inner_chunk_pos_to_chunk_index() {
    fn do_test(inner_chunk_pos: InnerChunkPos) {
        let index = inner_chunk_pos.to_chunk_index();
        let inner_chunk_pos2 = InnerChunkPos::make_from_chunk_index(index);
        assert_eq!(inner_chunk_pos, inner_chunk_pos2);
    }

    do_test(InnerChunkPos::new(0, 0, 0));
    do_test(InnerChunkPos::new(15, 15, 15));
}

#[test]
fn inner_chunk_pos_to_world_pos() {
    fn do_test(inner_chunk_pos: InnerChunkPos, chunk_pos: ChunkPos, world_pos: WorldPos) {
        assert_eq!(inner_chunk_pos.to_world_pos(&chunk_pos), world_pos);
    }

    do_test(
        InnerChunkPos::new(1, 2, 3),
        ChunkPos { x: 0, y: 0 },
        WorldPos { x: 1, y: 2, z: 3 },
    );

    do_test(
        InnerChunkPos::new(1, 2, 3),
        ChunkPos { x: 1, y: 1 },
        WorldPos { x: 17, y: 2, z: 19 },
    );

    do_test(
        InnerChunkPos::new(1, 2, 3),
        ChunkPos { x: -1, y: -1 },
        WorldPos {
            x: -15,
            y: 2,
            z: -13,
        },
    );

    do_test(
        InnerChunkPos::new(15, 0, 15),
        ChunkPos { x: -2, y: -3 },
        WorldPos {
            x: -17,
            y: 0,
            z: -33,
        },
    );
}

#[test]
fn world_pos_to_chunk_pos() {
    assert_eq!(
        WorldPos { x: 1, y: 2, z: 3 }.to_chunk_pos(),
        ChunkPos { x: 0, y: 0 }
    );
    assert_eq!(
        WorldPos { x: 0, y: 0, z: 0 }.to_chunk_pos(),
        ChunkPos { x: 0, y: 0 }
    );
    assert_eq!(
        WorldPos { x: -1, y: 0, z: -1 }.to_chunk_pos(),
        ChunkPos { x: -1, y: -1 }
    );

    assert_eq!(
        WorldPos {
            x: -16,
            y: 0,
            z: -16,
        }
        .to_chunk_pos(),
        ChunkPos { x: -1, y: -1 }
    );

    assert_eq!(
        WorldPos { x: 16, y: 0, z: 0 }.to_chunk_pos(),
        ChunkPos { x: 1, y: 0 }
    );

    assert_eq!(
        WorldPos { x: 0, y: 0, z: -1 }.to_chunk_pos(),
        ChunkPos { x: 0, y: -1 }
    );
}

#[test]
fn world_pos_to_inner_chunk_pos() {
    assert_eq!(
        WorldPos { x: 1, y: 2, z: 3 }.to_inner_chunk_pos(),
        InnerChunkPos::new(1, 2, 3)
    );

    assert_eq!(
        WorldPos { x: -1, y: 0, z: 1 }.to_inner_chunk_pos(),
        InnerChunkPos::new(15, 0, 1)
    );

    assert_eq!(
        WorldPos { x: -1, y: 0, z: -1 }.to_inner_chunk_pos(),
        InnerChunkPos::new(15, 0, 15)
    );

    assert_eq!(
        WorldPos {
            x: -32,
            y: 20,
            z: 0,
        }
        .to_inner_chunk_pos(),
        InnerChunkPos::new(0, 20, 0)
    );
}
