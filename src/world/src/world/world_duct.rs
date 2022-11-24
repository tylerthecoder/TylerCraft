use serde_wasm_bindgen::{from_value, to_value, Error};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

use crate::{
    block::{BlockData, BlockType, WorldBlock},
    chunk::Chunk,
    direction::Direction,
    world::{ChunkPos, WorldPos},
};

use super::World;

#[wasm_bindgen]
impl World {
    pub fn new_wasm() -> World {
        World {
            chunks: HashMap::new(),
        }
    }

    pub fn add_block_wasm(&mut self, val: JsValue) -> Result<(), Error> {
        from_value(val).and_then(|block: WorldBlock| {
            self.add_block(&block.world_pos, block.block_type, block.extra_data);
            Ok(())
        })
    }

    pub fn get_block_wasm(&self, val: JsValue) -> Result<JsValue, Error> {
        from_value(val).and_then(|pos: WorldPos| {
            let chunk_pos = Self::world_pos_to_chunk_pos(&pos);
            let chunk = self.get_chunk(&chunk_pos);

            web_sys::console::log_1(&JsValue::from_str(&format!(
                "get_block world pos: {:?} {:?} {:?} at chunk: {:?} {:?}. Chunk is loaded: {:?}",
                pos.x,
                pos.y,
                pos.z,
                chunk_pos.x,
                chunk_pos.y,
                chunk.is_some()
            )));
            let block = self.get_block(&pos);
            to_value(&block)
        })
    }

    pub fn is_block_loaded_wasm(&self, val: JsValue) -> Result<JsValue, Error> {
        from_value(val).and_then(|pos| {
            let chunk_pos = Self::world_pos_to_chunk_pos(&pos);
            let chunk = self.get_chunk(&chunk_pos);
            web_sys::console::log_1(&JsValue::from_str(&format!(
                "is_block_loaded world pos: {:?} {:?} {:?} at chunk: {:?} {:?}. Chunk is loaded: {:?}",
                pos.x,
                pos.y,
                pos.z,
                chunk_pos.x,
                chunk_pos.y,
                chunk.is_some()
            )));
            let is_loaded = self.is_block_loaded(&pos);
            to_value(&is_loaded)
        })
    }

    pub fn remove_block_wasm(&mut self, x: i32, y: i32, z: i32) {
        self.remove_block(&WorldPos { x, y, z });
    }

    pub fn load_chunk_wasm(&mut self, x: i16, y: i16) -> () {
        self.load_chunk(&ChunkPos { x, y });

        self.add_block(
            &WorldPos { x: 0, y: 0, z: 0 },
            BlockType::Image,
            BlockData::Image(Direction::Down),
        );
        self.add_block(
            &WorldPos { x: 0, y: 0, z: 1 },
            BlockType::Gold,
            BlockData::None,
        );
    }

    pub fn deserialize_chunk(&mut self, chunk: &JsValue) {
        let chunk: Chunk = chunk.into_serde().unwrap();
        self.insert_chunk(chunk);
    }

    pub fn has_chunk(&self, x: i16, y: i16) -> bool {
        let chunk_pos = ChunkPos { x, y };
        let index = Self::make_chunk_pos_index(&chunk_pos);
        self.chunks.contains_key(&index)
    }

    pub fn get_chunk_visible_faces(&self, x: i16, y: i16) -> JsValue {
        let chunk_pos = ChunkPos { x, y };

        match self.get_chunk(&chunk_pos) {
            Some(chunk) => JsValue::from_serde(&chunk.visible_faces).unwrap(),
            None => JsValue::null(),
        }
    }

    pub fn set_chunk_at_pos(&mut self, chunk: &JsValue) -> Result<(), JsValue> {
        let mut chunk: Chunk = serde_wasm_bindgen::from_value(chunk.clone())?;
        let index = Self::make_chunk_pos_index(&chunk.position);
        self.chunks.insert(index, chunk);
        Ok(())
    }
}
