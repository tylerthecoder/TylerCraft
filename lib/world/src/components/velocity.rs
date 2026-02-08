use crate::{entities::entity_component::impl_component, geometry::vec::impl_vector_ops};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct Velocity {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl_component!(Velocity);
impl_vector_ops!(Velocity, f32);

impl Velocity {
    pub fn new(x: f32, y: f32, z: f32) -> Velocity {
        Velocity { x, y, z }
    }

    pub fn zero() -> Velocity {
        Velocity {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        }
    }
}
