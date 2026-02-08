use serde::{Deserialize, Serialize};

use crate::components::fine_world_pos::FineWorldPos;
use crate::components::velocity::Velocity;
use crate::entities::entity::{Entity, EntityId};
use crate::entities::entity_action::{EntityActionDto, EntityActionDtoMaker, EntityActionHandler};
use crate::game::GameSchedule;
use crate::utils::js_log;
use crate::world::World;
use wasm_bindgen::prelude::wasm_bindgen;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TeleportActionData {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(Clone, Debug, Default)]
#[wasm_bindgen]
pub struct TeleportAction {}

impl EntityActionDtoMaker<TeleportActionData> for TeleportAction {
    fn get_action_type_static() -> &'static str {
        "Teleport"
    }
}

impl EntityActionHandler for TeleportAction {
    fn get_action_type(&self) -> &'static str {
        "Teleport"
    }

    fn handle_dto(
        &self,
        _world: &World,
        entity: &mut Entity,
        data: &EntityActionDto,
    ) -> GameSchedule {
        let data = data.get_data::<TeleportActionData>().unwrap();

        let new_pos = FineWorldPos {
            x: data.x,
            y: data.y,
            z: data.z,
        };

        js_log(&format!("Teleporting entity to {:?}", new_pos));

        entity.set::<FineWorldPos>(new_pos);
        entity.set::<Velocity>(Velocity::default());

        GameSchedule::empty()
    }
}

pub mod wasm {
    use super::*;

    #[wasm_bindgen]
    impl TeleportAction {
        pub fn make_wasm(entity_id: EntityId, x: f32, y: f32, z: f32) -> EntityActionDto {
            let data = TeleportActionData { x, y, z };
            TeleportAction::make_dto(entity_id, data)
        }
    }
}
