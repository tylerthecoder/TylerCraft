use crate::utils::js_log;

use super::entity_component::{Component, COMPONENT_REGISTRY};
use super::fireball::Fireball;
use super::player::Player;
use rand::Rng;
use serde::{de, ser::SerializeStruct, Deserialize, Deserializer, Serialize, Serializer};
use std::{any::TypeId, fmt::Debug};
use wasm_bindgen::prelude::*;

pub type EntityId = u32;

pub fn make_entity_id() -> EntityId {
    rand::thread_rng().gen_range(0..=u32::MAX)
}

#[derive(Debug)]
#[wasm_bindgen(getter_with_clone)]
pub struct Entity {
    pub id: EntityId,
    pub name: String,
    components: Vec<Box<dyn Component>>,
}

impl Serialize for Entity {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut s = serializer.serialize_struct("Entity", 2)?;
        s.serialize_field("id", &self.id)?;
        s.serialize_field("name", &self.name)?;

        // Convert components into serializable format
        let comps: Vec<_> = self
            .components
            .iter()
            .map(|c| {
                let type_name = c.type_name();
                let value = c.to_json().to_string();

                return (type_name, value);
            })
            .collect();

        js_log(&format!("Components: {:?}", comps));

        s.serialize_field("components", &comps)?;
        s.end()
    }
}

impl<'de> Deserialize<'de> for Entity {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        #[derive(Deserialize)]
        struct EntityHelper {
            id: EntityId,
            name: String,
            components: Vec<(String, String)>,
        }

        let EntityHelper {
            id,
            name,
            components,
        } = EntityHelper::deserialize(deserializer)?;
        let mut entity = Entity::new(id, name);

        let registry = COMPONENT_REGISTRY.lock().unwrap();
        for item in components {
            let (type_name, value) = item;

            let parsed_value = serde_json::from_str(&value).map_err(de::Error::custom)?;

            let all_type_names = registry.keys().cloned().collect::<Vec<_>>();

            let deser = registry.get(type_name.as_str()).ok_or_else(|| {
                de::Error::custom(format!(
                    "Unknown component: {} all_type_names: {:?}",
                    type_name, all_type_names
                ))
            })?;

            entity.components.push(deser(parsed_value));
        }

        Ok(entity)
    }
}

impl Clone for Entity {
    fn clone(&self) -> Self {
        Entity {
            id: self.id,
            name: self.name.clone(),
            components: self.components.iter().map(|c| c.clone()).collect(),
        }
    }
}

impl Entity {
    pub fn new(id: EntityId, name: String) -> Self {
        Self {
            id,
            name,
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

    pub fn to_json(&self) -> serde_json::Value {
        serde_json::to_value(self).unwrap()
    }

    pub fn from_json(value: serde_json::Value) -> Result<Entity, serde_json::Error> {
        serde_json::from_value(value)
    }

    pub fn print_components(&self) {
        println!("Entity ID: {:?}", self.id);
        for component in &self.components {
            println!("Component: {:?}", component);
            println!("Component Type ID: {:?}", component.as_any().type_id());
        }
    }
}

#[wasm_bindgen]
impl Entity {
    pub fn as_player(&self) -> Player {
        Player::new(self.clone())
    }

    pub fn as_fireball(&self) -> Fireball {
        Fireball::from_entity(self.clone())
    }

    pub fn to_js(&self) -> JsValue {
        serde_wasm_bindgen::to_value(self).unwrap()
    }

    pub fn from_js(value: JsValue) -> Result<Entity, serde_wasm_bindgen::Error> {
        serde_wasm_bindgen::from_value(value)
    }
}

#[cfg(test)]
mod tests {
    use crate::{components::world_pos::WorldPos, geometry::rotation::SphericalRotation};

    use super::*;

    #[test]
    fn test_serialize_deserialize() {
        let mut entity = Entity::new(1, "test".to_string());
        let world_pos = WorldPos { x: 1, y: 2, z: 3 };
        let spherical_rotation = SphericalRotation::new(0.0, 0.0);
        entity.add(world_pos);
        entity.add(spherical_rotation);
        let serialized = entity.to_json();
        let deserialized = Entity::from_json(serialized).unwrap();

        assert_eq!(entity.id, deserialized.id);
        assert_eq!(entity.components.len(), deserialized.components.len());

        let deserialized_world_pos = deserialized.get::<WorldPos>().unwrap();
        assert_eq!(world_pos.x, deserialized_world_pos.x);
        assert_eq!(world_pos.y, deserialized_world_pos.y);
        assert_eq!(world_pos.z, deserialized_world_pos.z);

        let deserialized_spherical_rotation = deserialized.get::<SphericalRotation>().unwrap();
        assert_eq!(
            spherical_rotation.theta,
            deserialized_spherical_rotation.theta
        );
        assert_eq!(spherical_rotation.phi, deserialized_spherical_rotation.phi);
    }
}
