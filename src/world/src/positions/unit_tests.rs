use crate::positions::{ChunkPos, InnerChunkPos, WorldPos};

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
    )
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
        InnerChunkPos { x: 1, y: 2, z: 3 }
    );

    assert_eq!(
        WorldPos { x: -1, y: 0, z: 1 }.to_inner_chunk_pos(),
        InnerChunkPos { x: 15, y: 0, z: 1 }
    );

    assert_eq!(
        WorldPos { x: -1, y: 0, z: -1 }.to_inner_chunk_pos(),
        InnerChunkPos { x: 15, y: 0, z: 15 }
    );

    assert_eq!(
        WorldPos {
            x: -32,
            y: 20,
            z: 0,
        }
        .to_inner_chunk_pos(),
        InnerChunkPos { x: 0, y: 20, z: 0 }
    );
}
