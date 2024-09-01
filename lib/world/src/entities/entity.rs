use std::{
    any::{Any, TypeId},
    fmt::Debug,
};
use wasm_bindgen::prelude::*;

use super::entity_component::Component;

pub type EntityId = u32;

#[derive(Debug)]
pub struct Entity {
    pub id: EntityId,
    components: Vec<Box<dyn Component>>,
}

impl Entity {
    pub fn new(id: EntityId) -> Self {
        Self {
            id,
            components: Vec::new(),
        }
    }

    pub fn add<T: Component + 'static>(&mut self, component: T) {
        self.components.push(Box::new(component));
    }

    pub fn get<T: Component + 'static>(&self) -> Option<&T> {
        self.components
            .iter()
            .find_map(|c| c.as_any().downcast_ref::<T>())
    }

    pub fn set<T: Component + 'static>(&mut self, component: T) {
        self.components
            .retain(|c| c.as_any().type_id() != TypeId::of::<T>());
        self.components.push(Box::new(component));
    }

    pub fn has<T: Component + 'static>(&self) -> bool {
        self.components
            .iter()
            .any(|c| c.as_any().type_id() == TypeId::of::<T>())
    }

    pub fn has_typeid(&self, type_id: TypeId) -> bool {
        self.components
            .iter()
            .any(|c| c.as_any().type_id() == type_id)
    }

    pub fn print_components(&self) {
        println!("Entity ID: {:?}", self.id);
        for component in &self.components {
            println!("Component: {:?}", component);
            println!("Component Type ID: {:?}", component.as_any().type_id());
        }
    }
}

#[derive(Debug)]
pub struct EntityQuery {
    type_ids: Vec<TypeId>,
}

impl EntityQuery {
    pub fn new() -> Self {
        Self { type_ids: vec![] }
    }

    pub fn add<T: Component + 'static>(&mut self) {
        self.type_ids.push(TypeId::of::<T>());
    }
}

// New struct to hold mutable references to filtered entities
#[derive(Debug)]
pub struct EntityQueryResults<'a> {
    pub entities: Vec<&'a mut Entity>,
}

impl<'a> EntityQueryResults<'a> {
    pub fn new(entities: Vec<&'a mut Entity>) -> Self {
        Self { entities }
    }

    pub fn len(&self) -> usize {
        self.entities.len()
    }
}

pub struct EntityHolder {
    entities: Vec<Entity>,
}

impl EntityHolder {
    pub fn new() -> EntityHolder {
        EntityHolder {
            entities: Vec::new(),
        }
    }

    pub fn add_entity(&mut self, entity: Entity) {
        self.entities.push(entity);
    }

    pub fn get_entity_by_id(&self, id: EntityId) -> Option<&Entity> {
        self.entities.iter().find(|entity| entity.id == id)
    }

    pub fn get_entity_by_id_mut(&mut self, id: EntityId) -> Option<&mut Entity> {
        self.entities.iter_mut().find(|entity| entity.id == id)
    }

    pub fn get_all(&self) -> &Vec<Entity> {
        &self.entities
    }

    pub fn get_all_mut(&mut self) -> &mut Vec<Entity> {
        &mut self.entities
    }

    pub fn query(&mut self, filter: &EntityQuery) -> EntityQueryResults {
        let filtered_entities = self
            .entities
            .iter_mut()
            .filter(|entity| {
                filter
                    .type_ids
                    .iter()
                    .all(|&type_id| entity.has_typeid(type_id))
            })
            .collect();

        EntityQueryResults::new(filtered_entities)
    }
}
