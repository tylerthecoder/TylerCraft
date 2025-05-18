use super::entity::{Entity, EntityId};
use super::entity_action::{EntityActionDto, EntityActionDtoMaker, EntityActionHandler};
use crate::geometry::rotation::SphericalRotation;
use crate::utils::js_log;
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
#[derive(Clone, Debug)]
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

    fn handle_dto(&self, entity: &mut Entity, data: &EntityActionDto) {
        let data = data.get_data::<RotateActionData>().unwrap();

        let new_rot = entity.get::<SphericalRotation>().unwrap().to_owned() + data.rot_diff;
        entity.set::<SphericalRotation>(new_rot);
    }
}

pub mod wasm {
    use super::*;

    #[wasm_bindgen]
    impl RotateAction {
        pub fn make_wasm(entity_id: EntityId, rot_diff: SphericalRotation) -> EntityActionDto {
            let data = RotateActionData { rot_diff };
            RotateAction::make_dto(entity_id, data)
        }
    }
}
