use crate::{
    block::{BlockData, BlockType},
    components::fine_world_pos::FineWorldPos,
    geometry::{ray::Ray, rotation::SphericalRotation},
    world::world_block::WorldBlock,
};

use super::{entity_action::EntityActionHandler, game::GameSchedule};
use serde::{Deserialize, Serialize};

use super::{
    entity::{Entity, EntityId},
    entity_action::{EntityActionDto, EntityActionDtoMaker},
    entity_component::impl_component,
    player::Flying,
};
use crate::direction::DirectionVectorExtension;
use crate::{components::velocity::Velocity, vec::Vector3Ops, world::World};
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UsePrimaryItemActionData {}

#[wasm_bindgen]
#[derive(Clone, Debug, Default)]
pub struct UsePrimaryItemAction {}

#[wasm_bindgen]
impl UsePrimaryItemAction {
    pub fn make_wasm(entity_id: EntityId) -> EntityActionDto {
        let data = UsePrimaryItemActionData {};
        UsePrimaryItemAction::make_dto(entity_id, data)
    }
}

impl EntityActionDtoMaker<UsePrimaryItemActionData> for UsePrimaryItemAction {
    fn get_action_type_static() -> &'static str {
        "UseItemAction"
    }
}

impl EntityActionHandler for UsePrimaryItemAction {
    fn get_action_type(&self) -> &'static str {
        "UseItemAction"
    }

    fn handle_dto(
        &self,
        world: &World,
        entity: &mut Entity,
        _data: &EntityActionDto,
    ) -> GameSchedule {
        let mut schedule = GameSchedule::empty();
        let belt = entity.get::<Belt>().unwrap();
        let pos = entity.get::<FineWorldPos>().unwrap();
        let rot = entity.get::<SphericalRotation>().unwrap();
        let selected_item = belt.selected_item;
        let belt_item = belt.belt_items[selected_item];

        let camera_ray = Ray {
            pos: *pos,
            rot: *rot,
        };

        let pointed_at = world.get_pointed_at_block(camera_ray);

        if let Some(pointed_at) = pointed_at {
            let looking_at_pos = pointed_at.block.world_pos;
            let new_pos = looking_at_pos.move_direction(&pointed_at.face);
            let block = WorldBlock {
                block_type: belt_item,
                extra_data: BlockData::None,
                world_pos: new_pos,
            };

            schedule.add_block(block);
        }

        schedule
    }
}

pub struct SecondaryBeltAction {}

pub struct SelectItemAction {}

#[derive(Debug, Serialize, Deserialize)]
pub struct Belt {
    belt_items: [BlockType; 10],
    selected_item: usize,
}

impl Default for Belt {
    fn default() -> Self {
        Belt {
            belt_items: [BlockType::Gold; 10],
            selected_item: 0,
        }
    }
}

impl_component!(Belt);
