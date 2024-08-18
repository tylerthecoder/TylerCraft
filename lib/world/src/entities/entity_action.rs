use std::any::Any;
use wasm_bindgen::prelude::*;
use std::fmt::Debug;

use super::entity::Entity;

#[wasm_bindgen]
pub struct EntityActionDto {
    pub entity_id: super::entity::EntityId,
    #[wasm_bindgen(skip)]
    pub name: &'static str,
    #[wasm_bindgen(skip)]
    pub data: Box<dyn CloneAny>,
}

pub trait EntityAction {
    fn entity_id(&self) -> super::entity::EntityId;
    fn get_name(&self) -> &'static str;
    fn get_dto(&self) -> EntityActionDto;
    fn handle(&self, entity: &mut Entity);
}

pub trait CloneAny: Any + Debug {
    fn clone_box(&self) -> Box<dyn CloneAny>;

    fn as_any(&self) -> &dyn Any;
}

impl<T> CloneAny for T
where
    T: Any + Clone + Debug,
{
    fn clone_box(&self) -> Box<dyn CloneAny> {
        Box::new(self.clone())
    }

    fn as_any(&self) -> &dyn Any {
        self
    }
}

impl EntityActionDto {
    pub fn is_action_type<T: CloneAny>(&self, name: &'static str) -> Option<&T> {
        if self.name == name {
            self.data.as_any().downcast_ref::<T>()
        } else {
            None
        }
    }
}

#[derive(Default)]
pub struct EntityActionHolder {
    actions: Vec<Box<dyn EntityAction>>,
}

impl EntityActionHolder {
    pub fn add_action(&mut self, action: Box<dyn EntityAction>) {
        self.actions.push(action);
    }

    pub fn get_actions(&self) -> &Vec<Box<dyn EntityAction>> {
        &self.actions
    }
}
