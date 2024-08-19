use std::fs::File;
use super::{entity::{Entity, EntityId}, entity_component::impl_component, player_jump_script::JumpData, player_move_script::MovingDirection};
use crate::{
    direction::Direction, geometry::{rotation::SphericalRotation, velocity::Velocity}, positions::FineWorldPos,
    vec::Vec3, world::World,
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};

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

pub mod wasm {
    use serde::{Deserialize, Serialize};
    use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
    use crate::{entities::{entity::{Entity, EntityId}, player_move_script::MovingDirection}, geometry::{rotation::SphericalRotation, velocity::Velocity}, positions::FineWorldPos};

    #[derive(Serialize, Deserialize)]

    pub struct WasmPlayer {
        pos: FineWorldPos,
        vel: Velocity,
        rot: SphericalRotation,
        moving_direction: MovingDirection,
    }

    impl WasmPlayer {
        pub fn make_from_entity(entity: &Entity) -> WasmPlayer {
            WasmPlayer {
                pos: entity.get::<FineWorldPos>().unwrap().to_owned(),
                vel: entity.get::<Velocity>().unwrap().to_owned(),
                rot: entity.get::<SphericalRotation>().unwrap().to_owned(),
                moving_direction: entity.get::<MovingDirection>().unwrap().to_owned(),
            }
        }
    }
}
