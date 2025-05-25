use super::entity::{Entity, EntityId};
use super::entity_action::{EntityActionDto, EntityActionDtoMaker, EntityActionHandler};
use super::game::GameSchedule;
use crate::geometry::rotation::SphericalRotation;
use crate::utils::js_log;
use crate::world::World;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RotateActionData {
    pub rot_diff: SphericalRotation,
}

#[wasm_bindgen]
#[derive(Clone, Debug, Default)]
pub struct RotateAction {}

impl EntityActionDtoMaker<RotateActionData> for RotateAction {
    fn get_action_type_static() -> &'static str {
        "Player-Rotate"
    }
}
impl EntityActionHandler for RotateAction {
    fn get_action_type(&self) -> &'static str {
        "Player-Rotate"
    }

    fn handle_dto(
        &self,
        _world: &World,
        entity: &mut Entity,
        data: &EntityActionDto,
    ) -> GameSchedule {
        let data = data.get_data::<RotateActionData>().unwrap();

        let new_rot = entity.get::<SphericalRotation>().unwrap().to_owned() + data.rot_diff;

        js_log(&format!("New rot: {:?}", new_rot));

        entity.set::<SphericalRotation>(new_rot);

        GameSchedule::empty()
    }
}

pub mod wasm {
    use wasm_bindgen::JsValue;

    use super::*;

    #[wasm_bindgen]
    impl RotateAction {
        pub fn make_wasm(entity_id: EntityId, rot_diff: SphericalRotation) -> EntityActionDto {
            let data = RotateActionData { rot_diff };
            RotateAction::make_dto(entity_id, data)
        }

        pub fn serialize_wasm(action: EntityActionDto) -> JsValue {
            let data = action.get_data::<RotateActionData>().unwrap();
            serde_wasm_bindgen::to_value(&data).unwrap()
        }
    }
}
