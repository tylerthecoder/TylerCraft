use super::{
    entity::{make_entity_id, Entity},
    velocity_script::Forces,
};
use crate::components::{fine_world_pos::FineWorldPos, size3::Size3, velocity::Velocity};
use wasm_bindgen::prelude::wasm_bindgen;

pub fn make_fireball(vel: Velocity) -> Entity {
    let uid = make_entity_id();
    let mut ent = Entity::new(uid, "fireball".to_string());
    ent.add::<FineWorldPos>(FineWorldPos {
        x: 5.0,
        y: 5.0,
        z: 5.0,
    });
    ent.add::<Velocity>(vel);
    ent.add::<Size3>(Size3 {
        x: 1.0,
        y: 1.0,
        z: 1.0,
    });
    ent.add::<Forces>(Forces { forces: vec![] });
    ent
}

#[wasm_bindgen]
pub struct Fireball {
    pub pos: FineWorldPos,
    pub vel: Velocity,
    pub dim: Size3,
}

#[wasm_bindgen]
impl Fireball {
    pub fn from_entity(entity: Entity) -> Fireball {
        Fireball {
            pos: entity.get::<FineWorldPos>().unwrap().clone(),
            vel: entity.get::<Velocity>().unwrap().clone(),
            dim: entity.get::<Size3>().unwrap().clone(),
        }
    }

    pub fn is_fireball(entity: &Entity) -> bool {
        entity.name == "fireball"
    }
}
