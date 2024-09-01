use super::{
    entity::{Entity, EntityId},
    entity_component::impl_component,
    player_jump_script::JumpData,
    player_move_script::MovingDirection,
};
use crate::{
    components::{fine_world_pos::FineWorldPos, velocity::Velocity},
    geometry::rotation::SphericalRotation,
};

#[derive(Debug)]
pub struct Flying {
    pub is_flying: bool,
    pub on_ground: bool,
}
impl_component!(Flying);

pub fn make_player(uid: EntityId) -> Entity {
    let mut ent = Entity::new(uid);
    ent.add::<FineWorldPos>(FineWorldPos::default());
    ent.add::<Velocity>(Velocity::default());
    ent.add::<SphericalRotation>(SphericalRotation::new(0.0, 0.0));
    ent.add::<MovingDirection>(None);
    ent.add::<JumpData>(JumpData::new(2.0));
    ent
}

pub mod wasm {
    use crate::{
        components::{fine_world_pos::FineWorldPos, velocity::Velocity}, entities::{
            entity::{Entity, EntityId},
            player_move_script::MovingDirection,
        }, geometry::rotation::SphericalRotation
    };
    use serde::{Deserialize, Serialize};
    use wasm_bindgen::{prelude::wasm_bindgen, JsValue};

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
                pos: entity.get::<FineWorldPos>().unwrap().clone(),
                vel: entity.get::<Velocity>().unwrap().clone(),
                rot: entity.get::<SphericalRotation>().unwrap().clone(),
                moving_direction: entity.get::<MovingDirection>().unwrap().to_owned(),
            }
        }
    }
}
