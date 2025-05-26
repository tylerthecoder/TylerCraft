use serde::{Deserialize, Serialize};

use super::{
    entity::{Entity, EntityId},
    entity_component::impl_component,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct Flying {
    pub is_flying: bool,
    pub on_ground: bool,
}
impl_component!(Flying);

pub fn make_player(uid: EntityId) -> Entity {
    let mut ent = Entity::new(uid);
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

pub mod wasm {
    use crate::{
        components::{fine_world_pos::FineWorldPos, size3::Size3, velocity::Velocity},
        entities::{
            entity::{Entity, EntityId},
            player_belt_script::Belt,
            player_gravity_script::GravityData,
            player_jump_script::JumpData,
            player_move_script::MovingDirection,
            velocity_script::Forces,
        },
        geometry::rotation::SphericalRotation,
    };
    use serde::{Deserialize, Serialize};
    use wasm_bindgen::{prelude::wasm_bindgen, JsValue};

    #[derive(Serialize, Deserialize, Debug, Clone)]
    #[wasm_bindgen]
    pub struct Player {
        pub id: EntityId,
        pub pos: FineWorldPos,
        pub vel: Velocity,
        pub rot: SphericalRotation,
        pub jump_data: JumpData,
        pub moving_direction: MovingDirection,
        #[serde(default = "Player::default_size")]
        pub size: Size3,
    }

    impl Player {
        fn default_size() -> Size3 {
            Size3::new(0.8, 1.8, 0.8)
        }
    }

    impl Player {
        pub fn make_from_entity(entity: &Entity) -> Player {
            Player {
                id: entity.id,
                pos: entity.get::<FineWorldPos>().unwrap().clone(),
                vel: entity.get::<Velocity>().unwrap().clone(),
                rot: entity.get::<SphericalRotation>().unwrap().clone(),
                moving_direction: entity.get::<MovingDirection>().unwrap().to_owned(),
                jump_data: entity.get::<JumpData>().unwrap().to_owned(),
                size: entity.get::<Size3>().unwrap().to_owned(),
            }
        }

        pub fn make_entity(&self) -> Entity {
            let mut ent = Entity::new(self.id);
            ent.add::<FineWorldPos>(self.pos);
            ent.add::<Velocity>(self.vel);
            ent.add::<SphericalRotation>(self.rot);
            ent.add::<MovingDirection>(self.moving_direction);
            ent.add::<JumpData>(JumpData::default());
            ent.add::<Belt>(Belt::default());
            ent.add::<GravityData>(GravityData { has_gravity: true });
            ent.add::<Forces>(Forces::default());
            ent.add::<Size3>(Size3::new(0.8, 1.8, 0.8));
            ent
        }
    }
}
