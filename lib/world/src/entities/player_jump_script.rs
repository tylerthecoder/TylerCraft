use crate::{geometry::velocity::Velocity, world::World};
use wasm_bindgen::prelude::wasm_bindgen;
use super::{entity::{Entity, EntityId, EntityQuery, EntityQueryResults}, entity_action::{EntityAction, EntityActionDto}, entity_component::impl_component, game::GameSchedule, game_script::GameScript, player::Flying};

#[wasm_bindgen]
pub struct PlayerJumpAction {
    pub entity_id: EntityId,
}

impl PlayerJumpAction {
    pub fn new(entity_id: EntityId) -> Self {
        Self { entity_id }
    }
}

impl EntityAction for PlayerJumpAction {
    fn get_name(&self) -> &'static str {
        "Jump-Action"
    }

    fn get_dto(&self) -> EntityActionDto {
        EntityActionDto {
            entity_id: self.entity_id,
            name: "Jump-Action",
            data: Box::new(()),
        }
    }

    fn handle(&self, entity: &mut Entity) {
        let jump_data = entity.get::<JumpData>().unwrap().to_owned();
        let vel = entity.get::<Velocity>().unwrap().to_owned();

        println!("jump_data: {:?}", jump_data);

        let flying = entity.get::<Flying>();

        if flying.is_some() && flying.unwrap().is_flying {
            return;
        }

        if jump_data.is_jumping {
            return;
        }

        let new_jump_data = jump_data.stop_jumping();


        let diff_y_vel = jump_data.jump_speed - vel.y;

        let jump_force = Velocity {
            x: 0.0,
            y: diff_y_vel,
            z: 0.0,
        };

        let new_vel = jump_force + vel;

        println!("new_vel: {:?}", new_vel);

        entity.set::<Velocity>(new_vel);
        entity.set::<JumpData>(new_jump_data);
    }

    fn entity_id(&self) -> super::entity::EntityId {
        self.entity_id
    }

}

#[wasm_bindgen]
#[derive(Debug)]
pub struct JumpData {
    jump_speed: f32,
    is_jumping: bool,
    have_db_jumped: bool,
    jump_count: u8,
}

impl JumpData {
    pub fn new(jump_speed: f32) -> Self {
        Self {
            jump_speed,
            is_jumping: false,
            have_db_jumped: false,
            jump_count: 0,
        }
    }

    pub fn stop_jumping(&self) -> JumpData {
        JumpData {
            is_jumping: false,
            ..*self
        }
    }
}

impl_component!(JumpData);
