use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use crate::{entities::entity_component::impl_component, positions::{ChunkPos, InnerChunkPos}, vec::{impl_vector_ops, Vector3Ops}};

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq)]
#[wasm_bindgen]
pub struct Size3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl_component!(Size3);

impl_vector_ops!(Size3, f32);