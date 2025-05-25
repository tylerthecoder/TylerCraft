use serde::{Deserialize, Serialize};

use super::{
    entity::{Entity, EntityId},
    entity_action::{EntityActionDto, EntityActionDtoMaker, EntityActionHandler},
    entity_component::impl_component,
    game::GameSchedule,
    player::Flying,
};
use crate::{components::velocity::Velocity, vec::Vector3Ops, world::World};
use wasm_bindgen::prelude::wasm_bindgen;

#[derive(Clone, Debug)]
pub struct JumpActionData {}

#[derive(Clone, Debug, Default)]
#[wasm_bindgen]
pub struct JumpAction {}
impl EntityActionDtoMaker<JumpActionData> for JumpAction {
    fn get_action_type_static() -> &'static str {
        "Jump-Action"
    }
}

impl EntityActionHandler for JumpAction {
    fn get_action_type(&self) -> &'static str {
        "Jump-Action"
    }

    fn handle_dto(
        &self,
        _world: &World,
        entity: &mut Entity,
        data: &EntityActionDto,
    ) -> GameSchedule {
        let _data = data.get_data::<JumpActionData>().unwrap();
        let jump_data = entity.get::<JumpData>().unwrap().to_owned();
        let vel = entity.get::<Velocity>().unwrap().to_owned();

        println!("jump_data: {:?}", jump_data);

        let flying = entity.get::<Flying>();

        if flying.is_some() && flying.unwrap().is_flying {
            return GameSchedule::empty();
        }

        if jump_data.is_jumping {
            return GameSchedule::empty();
        }

        let new_jump_data = jump_data.stop_jumping();

        let diff_y_vel = jump_data.jump_speed - vel.y;

        let jump_force = Velocity {
            x: 0.0,
            y: diff_y_vel,
            z: 0.0,
        };

        let new_vel = vel.add(&jump_force);

        println!("new_vel: {:?}", new_vel);

        entity.set::<Velocity>(new_vel);
        entity.set::<JumpData>(new_jump_data);

        GameSchedule::empty()
    }
}

#[wasm_bindgen]
#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
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

pub mod wasm {
    use super::*;

    #[wasm_bindgen]
    impl JumpAction {
        pub fn make_wasm(entity_id: EntityId) -> EntityActionDto {
            let data = JumpActionData {};
            JumpAction::make_dto(entity_id, data)
        }
    }
}
