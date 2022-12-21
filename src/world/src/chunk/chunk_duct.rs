use crate::{
    block::WorldBlock,
    chunk::{Chunk, InnerChunkPos},
    world::ChunkPos,
};
use serde_wasm_bindgen::{from_value, to_value, Error};
use wasm_bindgen::prelude::*;

// ==========================
// Might not need this at all.

#[wasm_bindgen]
impl Chunk {
    pub fn get_block_wasm(&self, val: JsValue) -> Result<JsValue, Error> {
        from_value(val).and_then(|pos: InnerChunkPos| {
            let block = self.get_block_type(&pos);
            to_value(&block)
        })
    }

    pub fn get_chunk_id(&self) -> String {
        self.position.to_index()
    }

    pub fn add_block_wasm(&mut self, js_block: JsValue) -> Result<(), Error> {
        from_value(js_block).and_then(|block: WorldBlock| {
            self.add_block(block.to_chunk_block());
            Ok(())
        })
    }

    pub fn deserialize(js_value: JsValue) -> Result<Chunk, Error> {
        from_value(js_value).and_then(|chunk: Chunk| Ok(chunk))
    }

    pub fn serialize(&self) -> Result<JsValue, JsValue> {
        Ok(serde_wasm_bindgen::to_value(&self)?)
    }

    // Need to see if this will mess up the hash map that is pointing to this chunk.
    pub fn set(&mut self, value: JsValue) -> Result<(), Error> {
        from_value(value).and_then(|chunk: Chunk| {
            *self = chunk;
            Ok(())
        })
    }

    pub fn make_wasm(x: i16, y: i16) -> Chunk {
        Chunk::new(ChunkPos { x, y })
    }
}
