use wasm_bindgen::prelude::wasm_bindgen;

use super::{
    entity::{Entity, EntityId},
    player_belt_script::Belt,
    player_gravity_script::GravityData,
    player_jump_script::JumpData,
    player_move_script::MovingDirection,
    velocity_script::Forces,
};
use crate::{
    components::{fine_world_pos::FineWorldPos, size3::Size3, velocity::Velocity},
    geometry::rotation::SphericalRotation,
};

pub fn make_player(uid: EntityId) -> Entity {
    let mut ent = Entity::new(uid, "player".to_string());
    ent.add::<FineWorldPos>(FineWorldPos {
        x: 0.0,
        y: 10.0,
        z: 0.0,
    });
    ent.add::<Size3>(Size3::new(0.8, 1.8, 0.8));
    ent.add::<Velocity>(Velocity::default());
    ent.add::<SphericalRotation>(SphericalRotation::new(0.0, 0.0));
    ent.add::<MovingDirection>(None);
    ent.add::<JumpData>(JumpData::default());
    ent.add::<Belt>(Belt::default());
    ent.add::<GravityData>(GravityData { has_gravity: true });
    ent.add::<Forces>(Forces::default());
    ent
}

#[wasm_bindgen]
pub struct Player {
    entity: Entity,
}

#[wasm_bindgen]
impl Player {
    pub fn new(entity: Entity) -> Player {
        Player { entity }
    }

    pub fn is_player(entity: &Entity) -> bool {
        entity.name == "player"
    }

    #[wasm_bindgen(getter)]
    pub fn dim(&self) -> Size3 {
        self.entity.get::<Size3>().unwrap().clone()
    }

    #[wasm_bindgen(getter)]
    pub fn pos(&self) -> FineWorldPos {
        self.entity.get::<FineWorldPos>().unwrap().clone()
    }

    #[wasm_bindgen(getter)]
    pub fn vel(&self) -> Velocity {
        self.entity.get::<Velocity>().unwrap().clone()
    }

    #[wasm_bindgen(getter)]
    pub fn rot(&self) -> SphericalRotation {
        self.entity.get::<SphericalRotation>().unwrap().clone()
    }

    #[wasm_bindgen(getter)]
    pub fn belt(&self) -> Belt {
        self.entity.get::<Belt>().unwrap().clone()
    }

    #[wasm_bindgen(getter)]
    pub fn moving_direction(&self) -> MovingDirection {
        self.entity.get::<MovingDirection>().unwrap().clone()
    }
}
