use wasm_bindgen::prelude::wasm_bindgen;

use crate::{
    block::WorldBlock,
    world::{World, WorldPos},
};

pub trait BlockGetter {
    fn get_block(&self, world_pos: &WorldPos) -> WorldBlock;
}

impl BlockGetter for World {
    fn get_block(&self, world_pos: &WorldPos) -> WorldBlock {
        self.get_block(world_pos)
    }
}

pub struct VoidBlockGetter;

impl BlockGetter for VoidBlockGetter {
    fn get_block(&self, world_pos: &WorldPos) -> WorldBlock {
        WorldBlock::empty(world_pos.to_owned())
    }
}
