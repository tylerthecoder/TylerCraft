use super::entities::Entities;
use super::entity::{Entity, EntityId};
use super::game::GameSchedule;
use crate::entities::player_belt_script::{
    SecondaryBeltActionData, SelectItemActionData, UsePrimaryItemActionData,
};
use crate::entities::player_jump_script::JumpActionData;
use crate::entities::player_move_script::MoveActionData;
use crate::entities::player_rot_script::RotateActionData;
use crate::utils::js_log;
use crate::world::World;
use lazy_static::lazy_static;
use std::any::Any;
use std::collections::HashMap;
use std::fmt::Debug;
use std::sync::Mutex;
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

type ActionSerializer = Box<dyn Fn(&EntityActionDto) -> JsValue + Send + Sync>;
type ActionDeserializer = Box<dyn Fn(EntityId, JsValue) -> EntityActionDto + Send + Sync>;

lazy_static! {
    pub static ref ACTION_REGISTRY: Mutex<HashMap<&'static str, (ActionSerializer, ActionDeserializer)>> = {
        let mut map = HashMap::new();

        fn register_action<T: ActionData + serde::Serialize + serde::de::DeserializeOwned + 'static>(
            map: &mut HashMap<&'static str, (ActionSerializer, ActionDeserializer)>,
            action_name: &'static str,
        ) {
            let serialize = Box::new(|dto: &EntityActionDto| -> JsValue {
                let action_data = dto.get_data::<T>().unwrap();
                let serialized_data = serde_wasm_bindgen::to_value(action_data).unwrap();

                // Create a JS object with entity_id, name, and data
                let obj = js_sys::Object::new();
                js_sys::Reflect::set(&obj, &"entity_id".into(), &dto.entity_id.into()).unwrap();
                js_sys::Reflect::set(&obj, &"name".into(), &dto.name.into()).unwrap();
                js_sys::Reflect::set(&obj, &"data".into(), &serialized_data).unwrap();
                obj.into()
            });

            let deserialize = Box::new(move |entity_id: EntityId, value: JsValue| -> EntityActionDto {
                js_log(&format!("Deserializing action id: {:?} data: {:?}", entity_id, value));
                let typed_action: T = serde_wasm_bindgen::from_value(value).unwrap();
                EntityActionDto {
                    entity_id,
                    name: action_name,
                    data: Box::new(typed_action),
                }
            });

            map.insert(action_name, (serialize, deserialize));
        }

        // Register all actions in one place!
        register_action::<RotateActionData>(&mut map, "Player-Rotate");
        register_action::<MoveActionData>(&mut map, "Move");
        register_action::<UsePrimaryItemActionData>(&mut map, "UseItemAction");
        register_action::<SecondaryBeltActionData>(&mut map, "SecondaryBeltAction");
        register_action::<SelectItemActionData>(&mut map, "SelectItemAction");
        register_action::<JumpActionData>(&mut map, "Jump-Action");

        Mutex::new(map)
    };
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

    pub fn to_js(&self) -> JsValue {
        let registry = ACTION_REGISTRY
            .lock()
            .expect("Failed to lock action registry");
        let (serializer, _) = registry.get(self.name).unwrap_or_else(|| {
            panic!("Action type '{}' not found in registry", self.name);
        });
        serializer(self)
    }

    pub fn from_js(js_value: JsValue) -> EntityActionDto {
        let obj = js_sys::Object::from(js_value);

        // Extract fields from the JS object
        let entity_id: EntityId = js_sys::Reflect::get(&obj, &"entity_id".into())
            .unwrap()
            .as_f64()
            .unwrap() as u32;

        let name: String = js_sys::Reflect::get(&obj, &"name".into())
            .unwrap()
            .as_string()
            .unwrap();

        let data = js_sys::Reflect::get(&obj, &"data".into()).unwrap();

        js_log(&format!("Deserializing action: {:?}", name));

        let registry = ACTION_REGISTRY
            .lock()
            .expect("Failed to lock action registry");
        let (_, deserializer) = registry.get(name.as_str()).unwrap_or_else(|| {
            panic!("Action type '{}' not found in registry", name);
        });

        deserializer(entity_id, data)
    }
}

pub trait EntityActionHandler {
    fn get_action_type(&self) -> &'static str;
    fn handle_dto(
        &self,
        world: &World,
        entity: &mut Entity,
        data: &EntityActionDto,
    ) -> GameSchedule;
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

    pub fn handle_actions(&mut self, world: &World, entity_holder: &mut Entities) -> GameSchedule {
        let mut schedule = GameSchedule::empty();
        for action in &self.actions {
            // js_log(&format!("Handling action: {:?}", action));
            // js_log(&format!("Action handlers: {:?}", self.handlers.len()));
            let entity = entity_holder.get_entity_by_id_mut(action.entity_id);
            let mut action_handled = false;
            if let Some(entity) = entity {
                for handler in &self.handlers {
                    if handler.get_action_type() == action.name {
                        let new_schedule = handler.handle_dto(world, entity, action);
                        schedule.combine(new_schedule);
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

        schedule
    }
}
