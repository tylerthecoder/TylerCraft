use std::fs::File;
use super::{entity::{Entity, EntityId}, entity_component::impl_component, player_jump_script::JumpData, player_move_script::MovingDirection};
use crate::{
    direction::Direction, geometry::{rotation::SphericalRotation, velocity::Velocity}, positions::FineWorldPos,
    vec::Vec3, world::World,
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};


// #[derive(Serialize, Deserialize)]
// #[wasm_bindgen]
// pub struct Player {
//     // config
//     speed: f32,
//     max_speed: f32,
//     gravity: f32,

//     #[wasm_bindgen(skip)]
//     pub pos: FineWorldPos,
//     dim: Size3,

//     pub is_flying: bool,
//     on_ground: bool,
// }


#[derive(Debug)]
pub struct Flying {
    pub is_flying: bool,
    pub on_ground: bool,
}
impl_component!(Flying);


pub fn make_player(uid: EntityId) -> Entity {
    let mut ent = Entity::new(uid);
    ent.add::<FineWorldPos>(FineWorldPos {
        x: 0.0,
        y: 0.0,
        z: 0.0,
    });
    ent.add::<Velocity>(Velocity::zero());
    ent.add::<SphericalRotation>(SphericalRotation::new(0.0, 0.0));
    ent.add::<MovingDirection>(None);
    ent.add::<JumpData>(JumpData::new(2.0));
    ent
}

// impl Player {
//     pub fn make(uid: EntityId) -> Player {
//         Player {
//             speed: 0.0,
//             max_speed: 0.0,
//             gravity: 0.0,
//             uid,
//             pos: FineWorldPos {
//                 x: 0.0,
//                 y: 0.0,
//                 z: 0.0,
//             },
//             dim: Size3 {
//                 x: 0.8,
//                 y: 1.8,
//                 z: 0.8,
//             },
//             rot: SphericalRotation::new(0.0, 0.0),
//             vel: Velocity::zero(),
//             is_flying: false,
//             on_ground: false,
//             moving_directions: Vec::new(),
//         }
//     }
// }

// pub mod wasm {
//     use wasm_bindgen::{prelude::wasm_bindgen, JsValue};

//     use crate::entities::entity::EntityId;

//     use super::Player;

//     #[wasm_bindgen]
//     impl Player {
//         pub fn make_wasm(uid: EntityId) -> JsValue {
//             serde_wasm_bindgen::to_value(&Player::make(uid)).unwrap()
//         }
//     }
// }
