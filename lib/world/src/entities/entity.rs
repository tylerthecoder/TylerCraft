use super::entity_component::Component;
use serde::{Deserialize, Serialize};
use serde_json;
use std::{
    any::{Any, TypeId},
    fmt::Debug,
};
use wasm_bindgen::prelude::*;

pub type EntityId = u32;

#[derive(Debug)]
#[wasm_bindgen(getter_with_clone)]
pub struct Entity {
    pub id: EntityId,
    components: Vec<Box<dyn Component>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[wasm_bindgen(getter_with_clone)]
pub struct SerializedEntity {
    pub id: EntityId,
    pub components: Vec<String>,
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

    pub fn serialize(&self) -> SerializedEntity {
        let components = self
            .components
            .iter()
            .map(|c| serde_json::to_string(c).unwrap())
            .collect();
        SerializedEntity {
            id: self.id,
            components,
        }
    }

    pub fn deserialize(serialized: SerializedEntity) -> Entity {
        let mut entity = Entity::new(serialized.id);
        entity.components = serialized
            .components
            .iter()
            .map(|c| serde_json::from_str(c).unwrap())
            .collect();
        entity
    }

    pub fn print_components(&self) {
        println!("Entity ID: {:?}", self.id);
        for component in &self.components {
            println!("Component: {:?}", component);
            println!("Component Type ID: {:?}", component.as_any().type_id());
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::components::world_pos::WorldPos;

    use super::*;

    #[test]
    fn test_serialize_deserialize() {
        let mut entity = Entity::new(1);
        let world_pos = WorldPos { x: 1, y: 2, z: 3 };
        entity.add(world_pos);
        let serialized = entity.serialize();
        let deserialized = Entity::deserialize(serialized);
        assert_eq!(entity.id, deserialized.id);
        assert_eq!(entity.components.len(), deserialized.components.len());

        let deserialized_world_pos = deserialized.get::<WorldPos>().unwrap();
        assert_eq!(world_pos.x, deserialized_world_pos.x);
        assert_eq!(world_pos.y, deserialized_world_pos.y);
        assert_eq!(world_pos.z, deserialized_world_pos.z);
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

#[wasm_bindgen]
#[derive(Debug)]
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

    pub fn serialize(&self) -> Vec<SerializedEntity> {
        self.entities
            .iter()
            .map(|entity| entity.serialize())
            .collect()
    }

    pub fn deserialize(&mut self, serialized_entities: Vec<SerializedEntity>) {
        self.entities = serialized_entities
            .iter()
            .map(|serialized| Entity::deserialize(serialized.clone()))
            .collect();
    }
}
