use crate::entities::player_rot_script::RotateActionData;
use crate::utils::js_log;

use super::entity::{Entity, EntityHolder, EntityId};
use serde::Serialize;
use std::any::Any;
use std::fmt::Debug;
use wasm_bindgen::prelude::*;

pub trait ActionData: Any + Debug {
    fn clone_box(&self) -> Box<dyn ActionData>;

    fn as_any(&self) -> &dyn Any;
}

impl<T> ActionData for T
where
    T: Any + Clone + Debug,
{
    fn clone_box(&self) -> Box<dyn ActionData> {
        Box::new(self.clone())
    }

    fn as_any(&self) -> &dyn Any {
        self
    }
}

#[wasm_bindgen(getter_with_clone)]
#[derive(Debug)]
pub struct EntityActionDto {
    pub entity_id: super::entity::EntityId,
    #[wasm_bindgen(skip)]
    pub name: &'static str,
    #[wasm_bindgen(skip)]
    pub data: Box<dyn ActionData>,
}

impl EntityActionDto {
    pub fn get_data<T: ActionData>(&self) -> Option<&T> {
        self.data.as_any().downcast_ref::<T>()
    }
}

#[wasm_bindgen]
impl EntityActionDto {
    pub fn get_name(&self) -> String {
        self.name.to_string()
    }
}

pub trait EntityActionHandler {
    fn get_action_type(&self) -> &'static str;
    fn handle_dto(&self, entity: &mut Entity, data: &EntityActionDto);
}

pub trait EntityActionDtoMaker<T: ActionData>: EntityActionHandler {
    fn get_action_type_static() -> &'static str;

    fn make_handler() -> Box<dyn EntityActionHandler>
    where
        Self: Sized + Default + 'static,
    {
        Box::new(Self::default())
    }

    fn make_dto(entity_id: EntityId, data: T) -> EntityActionDto {
        EntityActionDto {
            entity_id,
            name: Self::get_action_type_static(),
            data: Box::new(data),
        }
    }
}

#[derive(Default)]
pub struct EntityActionHolder {
    actions: Vec<EntityActionDto>,
    handlers: Vec<Box<dyn EntityActionHandler>>,
}

impl EntityActionHolder {
    pub fn add(&mut self, dto: EntityActionDto) {
        self.actions.push(dto);
    }

    pub fn add_handler(&mut self, handler: Box<dyn EntityActionHandler>) {
        self.handlers.push(handler);
    }

    pub fn handle_actions(&mut self, entity_holder: &mut EntityHolder) {
        for action in &self.actions {
            js_log(&format!("Handling action: {:?}", action));
            js_log(&format!("Num handlers: {:?}", self.handlers.len()));
            println!("Handling action: {:?}", action);
            let entity = entity_holder.get_entity_by_id_mut(action.entity_id);
            println!("Entity: {:?}", entity);
            let mut action_handled = false;
            if let Some(entity) = entity {
                for handler in &self.handlers {
                    if handler.get_action_type() == action.name {
                        handler.handle_dto(entity, action);
                        action_handled = true;
                    }
                }
            }
            if !action_handled {
                js_log(&format!("Action not handled: {:?}", action));
            }
        }

        // clear actions
        self.actions.clear();
    }
}

#[wasm_bindgen]
struct EntityActionJson {
    entity_id: EntityId,
    name: String,
    data: JsValue,
}

#[wasm_bindgen]
impl EntityActionJson {
    pub fn from_entity_action_dto(dto: &EntityActionDto) -> JsValue {
        match dto.name {
            "Player-Rotate" => {
                let data = dto.get_data::<RotateActionData>().unwrap();
                serde_wasm_bindgen::to_value(&data).unwrap()
            }
            _ => JsValue::null(),
        }
    }

    pub fn deserialize_wasm(entity_id: EntityId, name: String, data: JsValue) -> EntityActionDto {
        js_log(&format!("Deserializing action: {:?}", name));
        match name.as_str() {
            "Player-Rotate" => {
                let data = serde_wasm_bindgen::from_value::<RotateActionData>(data).unwrap();
                EntityActionDto {
                    entity_id,
                    name: "Player-Rotate",
                    data: Box::new(data),
                }
            }
            _ => panic!("Unknown action: {}", name),
        }
    }
}
