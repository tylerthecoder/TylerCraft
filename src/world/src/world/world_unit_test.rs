use crate::{
    chunk::InnerChunkPos,
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
}
