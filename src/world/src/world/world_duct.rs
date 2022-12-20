use super::World;
use crate::{
    block::WorldBlock,
    chunk::Chunk,
    world::{ChunkPos, WorldPos},
};
use serde_wasm_bindgen::{from_value, to_value, Error};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl World {
    fn convert_error<T>(error: T) -> Error
    where
        T: std::error::Error,
    {
        Error::new(&format!("{}", error))
    }

    pub fn new_wasm() -> World {
        World {
            chunks: HashMap::new(),
        }
    }

    pub fn add_block_wasm(&mut self, val: JsValue) -> Result<(), Error> {
        from_value(val).and_then(|block: WorldBlock| {
            self.add_block(&block.world_pos, block.block_type, block.extra_data)
                .map_err(Self::convert_error)
        })
    }

    pub fn get_block_wasm(&self, val: JsValue) -> Result<JsValue, Error> {
        from_value(val).and_then(|pos: WorldPos| {
            let block = self.get_block(&pos);
            to_value(&block)
        })
    }

    pub fn is_block_loaded_wasm(&self, val: JsValue) -> Result<JsValue, Error> {
        from_value(val).and_then(|pos| {
            let is_loaded = self.is_block_loaded(&pos);
            to_value(&is_loaded)
        })
    }

    pub fn remove_block_wasm(&mut self, x: i32, y: i32, z: i32) -> Result<(), Error> {
        self.remove_block(&WorldPos { x, y, z })
            .map_err(Self::convert_error)
    }

    pub fn load_chunk_wasm(&mut self, x: i16, y: i16) -> () {
        self.load_chunk(&ChunkPos { x, y });
    }

    pub fn deserialize_chunk(&mut self, value: JsValue) -> Result<(), Error> {
        from_value(value).and_then(|chunk: Chunk| {
            self.insert_chunk(chunk);
            Ok(())
        })
    }

    pub fn has_chunk(&self, x: i16, y: i16) -> bool {
        let chunk_pos = ChunkPos { x, y };
        let index = Self::make_chunk_pos_index(&chunk_pos);
        self.chunks.contains_key(&index)
    }

    pub fn set_chunk_at_pos(&mut self, chunk: &JsValue) -> Result<(), JsValue> {
        let chunk: Chunk = serde_wasm_bindgen::from_value(chunk.clone())?;
        let index = Self::make_chunk_pos_index(&chunk.position);
        self.chunks.insert(index, chunk);
        Ok(())
    }
}
