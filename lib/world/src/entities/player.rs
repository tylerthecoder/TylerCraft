use super::entity::{Entity, EntityId};
use crate::{
    direction::Direction, geometry::rotation::SphericalRotation, positions::FineWorldPos,
    vec::Vec3, world::World,
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::wasm_bindgen;

pub type Velocity = Vec3<f32>;
pub type Size3 = Vec3<f32>;

impl Velocity {
    pub fn zero() -> Velocity {
        Velocity {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        }
    }
}

#[derive(Serialize, Deserialize)]
#[wasm_bindgen]
pub struct Player {
    // config
    speed: f32,
    max_speed: f32,
    gravity: f32,

    uid: EntityId,

    #[wasm_bindgen(skip)]
    pub pos: FineWorldPos,
    dim: Size3,


    rot: SphericalRotation,
    #[wasm_bindgen(skip)]
    pub vel: Velocity,

    pub is_flying: bool,
    on_ground: bool,
    moving_directions: Vec<Direction>,
}

impl Entity for Player {
    fn update(&mut self, world: &World) {}

    fn id(&self) -> u32 {
        self.uid
    }
}

#[wasm_bindgen]
impl Player {
    pub fn make(uid: EntityId) -> Player {
        Player {
            speed: 0.0,
            max_speed: 0.0,
            gravity: 0.0,
            uid,
            pos: FineWorldPos {
                x: 0.0,
                y: 0.0,
                z: 0.0,
            },
            dim: Size3 {
                x: 0.8,
                y: 1.8,
                z: 0.8,
            },
            rot: SphericalRotation::new(0.0, 0.0),
            vel: Velocity::zero(),
            is_flying: false,
            on_ground: false,
            moving_directions: Vec::new(),
        }
    }
}
