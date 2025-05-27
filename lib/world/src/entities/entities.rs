use super::entity::{Entity, EntityId};
use super::entity_component::Component;
use super::player::Player;
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::{from_value, to_value};
use std::{any::TypeId, fmt::Debug};
use wasm_bindgen::prelude::*;

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

#[wasm_bindgen]
#[derive(Debug, Serialize, Deserialize)]
pub struct Entities {
    entities: Vec<Entity>,
}

impl Clone for Entities {
    fn clone(&self) -> Self {
        Entities {
            entities: self.entities.clone(),
        }
    }
}

impl Entities {
    pub fn new() -> Entities {
        Entities {
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

#[wasm_bindgen]
impl Entities {
    pub fn to_js(&self) -> JsValue {
        to_value(self).unwrap()
    }

    pub fn from_js(value: JsValue) -> Result<Entities, serde_wasm_bindgen::Error> {
        let entity_holder: Entities = from_value(value)?;
        Ok(entity_holder)
    }

    pub fn get_entity_as_player(&self, id: EntityId) -> Option<Player> {
        self.get_entity_by_id(id).map(|entity| entity.as_player())
    }

    pub fn get_all_clone(&self) -> Vec<Entity> {
        self.entities.clone()
    }

    pub fn get_entity_by_id_clone(&self, id: EntityId) -> Option<Entity> {
        self.get_entity_by_id(id).map(|entity| entity.clone())
    }
}
