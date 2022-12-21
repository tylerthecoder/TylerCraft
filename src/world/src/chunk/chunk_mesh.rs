use super::InnerChunkPos;
use crate::{
    block::{get_visible_faces, WorldBlock},
    block_getter::BlockGetter,
    direction::{Directions, ALL_DIRECTIONS},
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Default)]
pub struct ChunkMesh {
    pub face_map: HashMap<usize, Directions>,
}

impl ChunkMesh {
    update_block() {

    }


    // pub fn calculate_for_block(&mut self, block: &WorldBlock, block_getter: &dyn BlockGetter) {
    //     let faces = get_visible_faces(&block, block_getter);
    //     self.face_map
    //         .insert(block.world_pos.to_inner_chunk_pos().to_chunk_index(), faces);
    // }

    /**
     * Calculates the visible faces for all blocks.
     * This only needs to be called on the first load of a chunk
     * Also should be called when a chunk is loaded next to this chunk
     */
    // pub fn calculate_all(&mut self, world_poss: Vec<WorldPos>, block_getter: &dyn BlockGetter) {
    //     chunk
    //         .get_all_non_void_chunk_pos()
    //         .iter()
    //         .for_each(|inner_chunk_pos| {
    //             self.calculate_for_block(chunk, &inner_chunk_pos, block_getter)
    //         });
    // }

    // pub fn get_visible_faces_for_block(&self, pos: &InnerChunkPos) -> Directions {
    //     let index = pos.to_chunk_index();
    //     self.face_map.get(&index).copied().unwrap_or(ALL_DIRECTIONS)
    // }
}
