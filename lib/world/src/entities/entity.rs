use super::{entity_component::Component, player::wasm::Player};
use crate::{geometry::rotation::SphericalRotation, utils::js_log};
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::from_value;
use std::{
    any::{Any, TypeId},
    fmt::Debug,
};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

pub type EntityId = u32;

#[derive(Debug)]
#[wasm_bindgen(getter_with_clone)]
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

#[cfg(test)]
mod tests {
    use crate::components::world_pos::WorldPos;

    use super::*;

    // #[test]
    // fn test_serialize_deserialize() {
    //     let mut entity = Entity::new(1);
    //     let world_pos = WorldPos { x: 1, y: 2, z: 3 };
    //     let spherical_rotation = SphericalRotation::new(0.0, 0.0);
    //     entity.add(world_pos);
    //     entity.add(spherical_rotation);
    //     let serialized = entity.serialize();
    //     let deserialized = Entity::deserialize(serialized);
    //     assert_eq!(entity.id, deserialized.id);
    //     assert_eq!(entity.components.len(), deserialized.components.len());

    //     let deserialized_world_pos = deserialized.get::<WorldPos>().unwrap();
    //     assert_eq!(world_pos.x, deserialized_world_pos.x);
    //     assert_eq!(world_pos.y, deserialized_world_pos.y);
    //     assert_eq!(world_pos.z, deserialized_world_pos.z);

    //     let deserialized_spherical_rotation = deserialized.get::<SphericalRotation>().unwrap();
    //     assert_eq!(
    //         spherical_rotation.theta,
    //         deserialized_spherical_rotation.theta
    //     );
    //     assert_eq!(spherical_rotation.phi, deserialized_spherical_rotation.phi);
    // }
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

#[derive(Debug, Serialize, Deserialize, Tsify)]
#[wasm_bindgen(getter_with_clone)]
pub struct SerializedEntityHolder {
    pub entities: Vec<Player>,
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

    pub fn serialize(&self) -> SerializedEntityHolder {
        SerializedEntityHolder {
            entities: self
                .entities
                .iter()
                .map(|entity| Player::make_from_entity(entity))
                .collect(),
        }
    }

    pub fn deserialize(serialized_entities: SerializedEntityHolder) -> EntityHolder {
        let mut entity_holder = EntityHolder::new();
        entity_holder.entities = serialized_entities
            .entities
            .iter()
            .map(|serialized| Player::make_entity(serialized))
            .collect();
        entity_holder
    }

    pub fn deserialize_entity(&mut self, entity: JsValue) {
        let player: Player = from_value(entity).unwrap();
        let entity = Player::make_entity(&player);
        // add or update entity
        if let Some(existing_entity) = self.get_entity_by_id_mut(entity.id) {
            existing_entity.components = entity.components;
        } else {
            self.add_entity(entity);
        }
    }
}

#[wasm_bindgen]
impl EntityHolder {
    pub fn deserialize_wasm(value: JsValue) -> Result<EntityHolder, serde_wasm_bindgen::Error> {
        let entity_holder: SerializedEntityHolder = from_value(value)?;
        Ok(EntityHolder::deserialize(entity_holder))
    }
}
