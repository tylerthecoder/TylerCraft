use super::World;
use crate::{
    block::WorldBlock,
    chunk::Chunk,
    world::{ChunkPos, WorldPos},
};
use serde_wasm_bindgen::{from_value, to_value, Error};
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
        World::default()
    }

    pub fn add_block_wasm(&mut self, val: JsValue) -> Result<JsValue, Error> {
        from_value(val).and_then(|block: WorldBlock| {
            self.add_block(&block)
                .map_err(Self::convert_error)
                .and_then(|diff| to_value(&diff))
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

    pub fn remove_block_wasm(&mut self, x: i32, y: i32, z: i32) -> Result<JsValue, Error> {
        self.remove_block(&WorldPos { x, y, z })
            .map_err(Self::convert_error)
            .and_then(|diff| to_value(&diff))
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

    pub fn has_chunk_wasm(&self, value: JsValue) -> bool {
        from_value(value)
            .map(|pos: ChunkPos| self.has_chunk(&pos))
            .unwrap_or(false)
    }

    pub fn set_chunk_at_pos(&mut self, chunk: &JsValue) -> Result<(), JsValue> {
        let chunk: Chunk = serde_wasm_bindgen::from_value(chunk.clone())?;
        self.chunks.insert(chunk.position.to_world_index(), chunk);
        Ok(())
    }
}
