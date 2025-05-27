use crate::{entities::entity_component::impl_component, vec::impl_vector_ops};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq)]
#[wasm_bindgen]
pub struct Size3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Size3 {
    pub fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z }
    }
}

impl_component!(Size3);

impl_vector_ops!(Size3, f32);
