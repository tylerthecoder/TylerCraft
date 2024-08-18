use super::entity::EntityId;
use super::entity_action::{EntityAction, EntityActionDto};
use crate::geometry::rotation::SphericalRotation;
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
pub struct PlayerRotAction {
    pub player_id: EntityId,
    pub rot_diff: SphericalRotation,
}

impl EntityAction for PlayerRotAction {
    fn entity_id(&self) -> super::entity::EntityId {
        self.player_id
    }

    fn get_name(&self) -> &'static str {
        "PlayerRot"
    }

    fn get_dto(&self) -> super::entity_action::EntityActionDto {
        EntityActionDto {
            entity_id: self.player_id,
            name: "PlayerRot",
            data: Box::new(self.rot_diff),
        }
    }

    fn handle(&self, entity: &mut super::entity::Entity) {
        let new_rot = entity.get::<SphericalRotation>().unwrap().to_owned() + self.rot_diff;
        entity.set::<SphericalRotation>(new_rot);
    }
}
