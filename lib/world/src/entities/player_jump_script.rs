use serde::{Deserialize, Serialize};

use super::{
    entity::{Entity, EntityId},
    entity_action::{EntityActionDto, EntityActionDtoMaker, EntityActionHandler},
    entity_component::impl_component,
    game::GameSchedule,
    player::Flying,
};
use crate::{
    components::velocity::Velocity, entities::velocity_script::Forces, utils::js_log, world::World,
};
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
        _data: &EntityActionDto,
    ) -> GameSchedule {
        let jump_data = entity.get::<JumpData>().unwrap().to_owned();
        let mut forces = entity.get::<Forces>().unwrap().to_owned();

        let jump_force = Velocity {
            x: 0.0,
            y: jump_data.jump_speed,
            z: 0.0,
        };

        forces.add_force(jump_force);

        js_log(&format!("jump_force: {:?}", jump_force));

        entity.set::<Forces>(forces);

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

impl Default for JumpData {
    fn default() -> Self {
        Self::new(0.25)
    }
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
