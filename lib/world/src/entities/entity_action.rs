use std::any::Any;
use wasm_bindgen::prelude::*;
use std::fmt::Debug;
use super::entity::{Entity, EntityHolder, EntityId};

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


#[wasm_bindgen]
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
            data: Box::new(data)
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

    pub fn handle_actions(&self, entity_holder: &mut EntityHolder) {
        for action in &self.actions {
            println!("Handling action: {:?}", action);
            let entity = entity_holder.get_entity_by_id_mut(action.entity_id);
            println!("Entity: {:?}", entity);
            if let Some(entity) = entity {
                for handler in &self.handlers {
                    if handler.get_action_type() == action.name {
                        handler.handle_dto(entity, action);
                    }
                }
            }
        }
    }
}
