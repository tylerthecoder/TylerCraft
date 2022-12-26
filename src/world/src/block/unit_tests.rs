use crate::{
    block::{BlockData, BlockType, WorldBlock},
    direction::Direction,
    positions::WorldPos,
};
use std::collections::HashMap;

#[test]
fn is_block_face_visible() {
    let world_block = WorldBlock {
        block_type: BlockType::Cloud,
        extra_data: BlockData::None,
        world_pos: WorldPos { x: 0, y: 0, z: 0 },
    };

    let adjacent_world_block = WorldBlock {
        block_type: BlockType::Cloud,
        extra_data: BlockData::None,
        world_pos: WorldPos { x: 0, y: 0, z: 0 },
    };

    let is_visible = world_block.is_block_face_visible(&adjacent_world_block);

    assert_eq!(is_visible, false);

    let adjacent_world_block = WorldBlock {
        block_type: BlockType::Void,
        extra_data: BlockData::None,
        world_pos: WorldPos { x: 0, y: 0, z: 0 },
    };

    let is_visible = world_block.is_block_face_visible(&adjacent_world_block);

    assert_eq!(is_visible, true);
}

#[test]
fn gets_visible_faces() {
    let world_block = WorldBlock {
        block_type: BlockType::Cloud,
        extra_data: BlockData::None,
        world_pos: WorldPos { x: 0, y: 0, z: 0 },
    };

    let adjacent_blocks = HashMap::new();

    let faces = world_block.get_visible_faces(adjacent_blocks);

    assert_eq!(faces.into_iter().len(), 6);

    let mut adjacent_blocks: HashMap<Direction, WorldBlock> = HashMap::new();

    adjacent_blocks.insert(
        Direction::East,
        WorldBlock {
            block_type: BlockType::Cloud,
            extra_data: BlockData::None,
            world_pos: WorldPos { x: 0, y: 0, z: 0 },
        },
    );

    let faces = world_block.get_visible_faces(adjacent_blocks);

    assert_eq!(faces.into_iter().len(), 5);
    assert_eq!(faces.has_direction(Direction::East), false);
}
