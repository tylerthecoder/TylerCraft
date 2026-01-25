use crate::game::Game;

use super::entity::{Entity, EntityId};
use super::entity_component::Component;
use super::fireball::Fireball;
use super::player::Player;
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::{from_value, to_value};
use std::collections::HashSet;
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

    pub fn get_entity_by_id(&self, id: EntityId) -> Option<&Entity> {
        self.entities.iter().find(|entity| entity.id == id)
    }

    pub fn get_entity_by_id_mut(&mut self, id: EntityId) -> Option<&mut Entity> {
        self.entities.iter_mut().find(|entity| entity.id == id)
    }

    pub fn get_all(&self) -> &Vec<Entity> {
        &self.entities
    }

    pub fn get_all_entity_ids(&self) -> HashSet<EntityId> {
        self.entities.iter().map(|entity| entity.id).collect()
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

impl Entities {
    pub fn add_entity(&mut self, entity: Entity) {
        self.entities.push(entity);
    }

    pub fn get_entity(&self, id: EntityId) -> Option<Entity> {
        self.entities.iter().find(|entity| entity.id == id).cloned()
    }

    pub fn to_js(&self) -> JsValue {
        to_value(self).unwrap()
    }

    pub fn get_entity_as_player(&self, id: EntityId) -> Option<Player> {
        self.get_entity_by_id(id).map(|entity| entity.as_player())
    }

    pub fn get_entity_as_fireball(&self, id: EntityId) -> Option<Fireball> {
        self.get_entity_by_id(id).map(|entity| entity.as_fireball())
    }

    pub fn get_all_clone(&self) -> Vec<Entity> {
        self.entities.clone()
    }

    pub fn get_entity_by_id_clone(&self, id: EntityId) -> Option<Entity> {
        self.get_entity_by_id(id).map(|entity| entity.clone())
    }
}

#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(js_name = "getEntityAsPlayer")]
    pub fn get_entity_as_player(&self, id: EntityId) -> Option<Player> {
        self.entities.get_entity_as_player(id)
    }

    #[wasm_bindgen(js_name = "getEntityById")]
    pub fn get_entity_by_id(&self, id: EntityId) -> Option<Entity> {
        self.entities.get_entity_by_id_clone(id)
    }

    #[wasm_bindgen(js_name = "getAllEntities")]
    pub fn get_all_entities(&self) -> Vec<Entity> {
        self.entities.get_all_clone()
    }

    #[wasm_bindgen(js_name = "serializeEntities")]
    pub fn serialize_entities(&self) -> JsValue {
        to_value(&self.entities).unwrap()
    }

    #[wasm_bindgen(js_name = "addEntity")]
    pub fn add_entity(&mut self, entity: Entity) {
        self.entities.add_entity(entity);
    }
}

#[wasm_bindgen]
impl Entities {
    #[wasm_bindgen(js_name = "deserialize")]
    pub fn from_js(value: JsValue) -> Result<Entities, serde_wasm_bindgen::Error> {
        from_value(value)
    }
}
