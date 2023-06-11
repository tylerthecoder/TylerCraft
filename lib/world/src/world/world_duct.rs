use super::World;
use crate::{
    chunk::Chunk,
    direction::Directions,
    geometry::ray::Ray,
    world::{world_block::WorldBlock, ChunkPos, WorldPos},
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

    pub fn get_pointed_at_block_wasm(&self, val: JsValue) -> Result<JsValue, Error> {
        from_value(val).and_then(|ray: Ray| {
            let block = self.get_pointed_at_block(ray);
            to_value(&block)
        })
    }

    pub fn get_block_wasm(&self, val: JsValue) -> Result<JsValue, Error> {
        from_value(val).and_then(|pos: WorldPos| {
            let block = self.get_block(&pos);
            to_value(&block)
        })
    }

    pub fn get_chunk_mesh_wasm(&self, val: JsValue) -> Result<JsValue, Error> {
        from_value(val).and_then(|pos: ChunkPos| {
            let mesh = self.get_chunk_mesh(&pos).map_err(Self::convert_error)?;

            let wasm_chunk_mesh = mesh
                .into_iter()
                .map(|(world_pos, directions)| {
                    let block = self.get_block(&world_pos);
                    (block, directions.to_owned())
                })
                .collect::<Vec<(WorldBlock, Directions)>>();

            to_value(&wasm_chunk_mesh)
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

    pub fn insert_chunk_wasm(&mut self, chunk: &JsValue) -> Result<(), JsValue> {
        let chunk: Chunk = from_value(chunk.clone())?;
        self.insert_chunk(chunk);
        Ok(())
    }
}
