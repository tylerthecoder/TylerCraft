use crate::{
    block::{BlockData, BlockType},
    components::fine_world_pos::FineWorldPos,
    geometry::{ray::Ray, rotation::SphericalRotation},
    utils::js_log,
    world::world_block::WorldBlock,
};

use super::{entity_action::EntityActionHandler, game::GameSchedule};
use serde::{Deserialize, Serialize};

use super::{
    entity::{Entity, EntityId},
    entity_action::{EntityActionDto, EntityActionDtoMaker},
    entity_component::impl_component,
};
use crate::direction::DirectionVectorExtension;
use crate::{vec::Vector3Ops, world::World};
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

        let eye_pos_offset = FineWorldPos::new(0.4, 1.5, 0.4);

        let camera_ray = Ray {
            pos: pos.add(&eye_pos_offset),
            rot: *rot,
        };

        let pointed_at = world.get_pointed_at_block(camera_ray);

        if let Some(pointed_at) = pointed_at {
            let looking_at_pos = pointed_at.block.world_pos;
            js_log(&format!("looking_at_pos: {:?}", looking_at_pos));
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

#[wasm_bindgen]
#[derive(Clone, Debug, Default)]
pub struct SecondaryBeltAction {}

#[wasm_bindgen]
impl SecondaryBeltAction {
    pub fn make_wasm(entity_id: EntityId) -> EntityActionDto {
        let data = SecondaryBeltActionData {};
        SecondaryBeltAction::make_dto(entity_id, data)
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug, Default)]
pub struct SecondaryBeltActionData {}

impl EntityActionDtoMaker<SecondaryBeltActionData> for SecondaryBeltAction {
    fn get_action_type_static() -> &'static str {
        "SecondaryBeltAction"
    }
}

impl EntityActionHandler for SecondaryBeltAction {
    fn get_action_type(&self) -> &'static str {
        "SecondaryBeltAction"
    }

    fn handle_dto(
        &self,
        world: &World,
        entity: &mut Entity,
        _data: &EntityActionDto,
    ) -> GameSchedule {
        let mut schedule = GameSchedule::empty();
        let pos = entity.get::<FineWorldPos>().unwrap();
        let rot = entity.get::<SphericalRotation>().unwrap();
        let eye_pos_offset = FineWorldPos::new(0.4, 1.5, 0.4);

        let camera_ray = Ray {
            pos: pos.add(&eye_pos_offset),
            rot: *rot,
        };

        let pointed_at = world.get_pointed_at_block(camera_ray);

        if let Some(pointed_at) = pointed_at {
            let looking_at_pos = pointed_at.block.world_pos;
            schedule.remove_block(looking_at_pos);
        }

        schedule
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug, Default)]
pub struct SelectItemAction {}

#[wasm_bindgen]
impl SelectItemAction {
    pub fn make_wasm(entity_id: EntityId, item_index: usize) -> EntityActionDto {
        let data = SelectItemActionData { item_index };
        SelectItemAction::make_dto(entity_id, data)
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug, Default)]
pub struct SelectItemActionData {
    pub item_index: usize,
}

impl EntityActionDtoMaker<SelectItemActionData> for SelectItemAction {
    fn get_action_type_static() -> &'static str {
        "SelectItemAction"
    }
}

impl EntityActionHandler for SelectItemAction {
    fn get_action_type(&self) -> &'static str {
        "SelectItemAction"
    }

    fn handle_dto(
        &self,
        _world: &World,
        entity: &mut Entity,
        data: &EntityActionDto,
    ) -> GameSchedule {
        let mut belt = entity.get::<Belt>().unwrap().to_owned();
        let data = data.get_data::<SelectItemActionData>().unwrap();
        belt.selected_item = data.item_index;
        entity.set::<Belt>(belt);
        GameSchedule::empty()
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
#[wasm_bindgen]
pub struct Belt {
    belt_items: [BlockType; 10],
    pub selected_item: usize,
}

#[wasm_bindgen]
impl Belt {
    pub fn get_item(&self, index: usize) -> BlockType {
        self.belt_items[index]
    }

    pub fn get_num_items(&self) -> usize {
        self.belt_items.len()
    }
}

impl Default for Belt {
    fn default() -> Self {
        let belt_items = [
            BlockType::Gold,
            BlockType::Stone,
            BlockType::Grass,
            BlockType::Water,
            BlockType::Planks,
            BlockType::Red,
            BlockType::RedFlower,
            BlockType::Wood,
            BlockType::Leaf,
            BlockType::Cloud,
        ];
        Belt {
            belt_items,
            selected_item: 0,
        }
    }
}

impl_component!(Belt);
