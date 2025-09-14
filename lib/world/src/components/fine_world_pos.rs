use crate::components::world_pos::WorldPos;
use crate::{
    entities::entity_component::impl_component,
    geometry::vec::{impl_vector_ops, Vector3Ops},
};
use serde::{Deserialize, Serialize};
use std::ops::Add;
use wasm_bindgen::prelude::*;

use super::velocity::Velocity;

const PRECISION: f32 = 0.001; // Precision to three decimal places

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq)]
#[wasm_bindgen]
pub struct FineWorldPos {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl_component!(FineWorldPos);

impl_vector_ops!(FineWorldPos, f32);

impl FineWorldPos {
    pub fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z }
    }

    pub fn to_world_pos(&self) -> WorldPos {
        WorldPos {
            x: self.x as i32,
            y: self.y as i32,
            z: self.z as i32,
        }
    }

    pub fn round(&mut self) {
        self.x = (self.x / PRECISION).round() * PRECISION;
        self.y = (self.y / PRECISION).round() * PRECISION;
        self.z = (self.z / PRECISION).round() * PRECISION;
    }

    pub fn equal(&self, other: &FineWorldPos) -> bool {
        (self.x - other.x).abs() < PRECISION
            && (self.y - other.y).abs() < PRECISION
            && (self.z - other.z).abs() < PRECISION
    }
}

impl Add<Velocity> for FineWorldPos {
    type Output = Self;

    fn add(self, other: Velocity) -> Self {
        Self {
            x: self.x + other.x,
            y: self.y + other.y,
            z: self.z + other.z,
        }
    }
}

#[cfg(test)]
pub mod tests {
    use crate::{components::fine_world_pos::FineWorldPos, geometry::vec::Vector3Ops};

    #[test]
    fn test_distance_to() {
        let vec1 = FineWorldPos {
            x: 0 as f32,
            y: 0 as f32,
            z: 0 as f32,
        };
        let vec2 = FineWorldPos {
            x: 1 as f32,
            y: 1 as f32,
            z: 1 as f32,
        };
        assert_eq!(vec1.distance_to(&vec2), 1.7320508);

        let vec1 = FineWorldPos {
            x: 0 as f32,
            y: 0 as f32,
            z: 0 as f32,
        };
        let vec2 = FineWorldPos {
            x: 1 as f32,
            y: 0 as f32,
            z: 0 as f32,
        };
        assert_eq!(vec1.distance_to(&vec2), 1.0);
    }
}
