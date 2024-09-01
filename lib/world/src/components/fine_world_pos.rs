use std::ops::Add;
use crate::components::world_pos::WorldPos;
use crate::{entities::entity_component::impl_component, vec::{impl_vector_ops, Vec3f32, Vector3Ops}};
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

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
    pub fn from_vec3(vec: Vec3f32) -> Self {
        Self {
            x: vec.x(),
            y: vec.y(),
            z: vec.z(),
        }
    }

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