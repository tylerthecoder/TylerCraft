use std::any::Any;
use crate::{geometry::rotation::SphericalRotation, world::World};
use super::{entity::{EntityAction, EntityId}, game::{Game, PlayerScript}, player::Player};
use wasm_bindgen::prelude::wasm_bindgen;

pub struct PlayerRotAction {
	pub player_id: String,
	pub rot_diff: SphericalRotation,
}

impl PlayerRotAction {
	pub fn new(player_id: EntityId, rot_diff: SphericalRotation) -> EntityAction {
		EntityAction {
			entity_id: player_id,
			name: "PlayerRot",
			data: Box::new(rot_diff),
		}
	}
}

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub struct PlayerRotScript {
	pub rot: SphericalRotation,
}

impl PlayerRotScript {
	pub fn apply_rot(&mut self, rot: SphericalRotation) {
		self.rot = self.rot + rot;
	}
}

impl PlayerScript for PlayerRotScript {
	fn name(&self) -> &'static str {
		"PlayerRot"
	}

	fn handle_action(&mut self, action: EntityAction) {
		if action.name == "PlayerRot" {
			let data = action.data;
			if let Some(rot_diff) = data.downcast_ref::<SphericalRotation>() {
				self.apply_rot(*rot_diff);
			} else {
				panic!("PlayerRotScript received invalid action data");
			}
		}
	}

	fn as_any(&self) -> &dyn Any {
		self
	}


	fn update(&mut self, world: &World, player: &mut Player) {
		// NO-OP

	}
}