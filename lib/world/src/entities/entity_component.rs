use lazy_static::lazy_static;
use serde_json::Value;
use std::{any::Any, collections::HashMap, fmt::Debug, sync::Mutex};
use wasm_bindgen::JsValue;

use crate::{
    components::{
        fine_world_pos::FineWorldPos, size3::Size3, velocity::Velocity, world_pos::WorldPos,
    },
    entities::player::Health,
    geometry::rotation::SphericalRotation,
    scripts::{
        player_belt_script::Belt, player_gravity_script::GravityData, player_jump_script::JumpData,
        player_move_script::MovingDirection, velocity_script::Forces,
    },
};

pub trait Component: Any + Debug {
    fn as_any(&self) -> &dyn Any;
    fn as_any_mut(&mut self) -> &mut dyn Any;
    fn get_name(&self) -> &str;
    fn clone_box(&self) -> Box<dyn Component>;
    fn type_name(&self) -> &'static str;
    fn to_js(&self) -> JsValue;
    fn to_json(&self) -> serde_json::Value;
}

macro_rules! impl_component {
    ($type:ty) => {
        impl $crate::entities::entity_component::Component for $type {
            fn as_any(&self) -> &dyn std::any::Any {
                self
            }
            fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
                self
            }
            fn get_name(&self) -> &str {
                stringify!($type)
            }
            fn clone_box(&self) -> Box<dyn $crate::entities::entity_component::Component> {
                Box::new(self.clone())
            }
            fn type_name(&self) -> &'static str {
                std::any::type_name::<$type>()
            }
            fn to_js(&self) -> wasm_bindgen::prelude::JsValue {
                serde_wasm_bindgen::to_value(self).expect("Component must be serializable")
            }
            fn to_json(&self) -> serde_json::Value {
                serde_json::to_value(self).expect("Component must be serializable")
            }
        }
    };
}
pub(crate) use impl_component;

impl Clone for Box<dyn Component> {
    fn clone(&self) -> Box<dyn Component> {
        self.clone_box()
    }
}

type ComponentDeserializer = fn(Value) -> Box<dyn Component>;

lazy_static! {
    pub static ref COMPONENT_REGISTRY: Mutex<HashMap<&'static str, ComponentDeserializer>> = {
        let mut map = HashMap::new();

        fn register<T: Component + serde::de::DeserializeOwned + 'static>(
            map: &mut HashMap<&'static str, ComponentDeserializer>,
        ) {
            fn deser<T: Component + serde::de::DeserializeOwned + 'static>(
                v: Value,
            ) -> Box<dyn Component> {
                Box::new(serde_json::from_value::<T>(v).unwrap())
            }

            map.insert(std::any::type_name::<T>(), deser::<T>);
        }

        // Register all the components!
        register::<FineWorldPos>(&mut map);
        register::<Velocity>(&mut map);
        register::<Size3>(&mut map);
        register::<SphericalRotation>(&mut map);
        register::<JumpData>(&mut map);
        register::<MovingDirection>(&mut map);
        register::<GravityData>(&mut map);
        register::<Forces>(&mut map);
        register::<Belt>(&mut map);
        register::<WorldPos>(&mut map);
        register::<Health>(&mut map);

        Mutex::new(map)
    };
}
