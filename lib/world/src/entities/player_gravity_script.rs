use super::{
    entities::{EntityQuery, EntityQueryResults},
    entity_component::impl_component,
    game::GameSchedule,
    game_script::GameScript,
    velocity_script::Forces,
};
use crate::{chunk::chunk_fetcher::ChunkFetcher, components::velocity::Velocity, world::World};
use serde::{Deserialize, Serialize};
use serde_json;
use serde_wasm_bindgen;
use wasm_bindgen::JsValue;

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct GravityData {
    pub has_gravity: bool,
}

impl_component!(GravityData);

#[derive(Debug)]
pub struct GravityScript {
    gravity: f32,
}

impl Default for GravityScript {
    fn default() -> Self {
        Self { gravity: 0.011 }
    }
}

impl GameScript for GravityScript {
    fn get_name(&self) -> String {
        "gravity".to_string()
    }

    fn get_config(&self) -> JsValue {
        let config = serde_json::json!({
            "gravity_strength": self.gravity,
        });
        serde_wasm_bindgen::to_value(&config).unwrap()
    }

    fn set_config(&mut self, config: JsValue) {
        if let Ok(config_obj) = serde_wasm_bindgen::from_value::<serde_json::Value>(config.clone())
        {
            if let Some(gravity) = config_obj.get("gravity_strength").and_then(|v| v.as_f64()) {
                self.gravity = gravity as f32;
            }
        }
        web_sys::console::log_1(&format!("GravityScript config updated: {:?}", config).into());
    }

    fn get_query(&self) -> EntityQuery {
        let mut query = EntityQuery::new();
        query.add::<Velocity>();
        query.add::<Forces>();
        query.add::<GravityData>();
        query
    }

    fn update(
        &mut self,
        _world: &World,
        query_results: EntityQueryResults,
        _chunk_fetcher: &mut ChunkFetcher,
    ) -> Option<GameSchedule> {
        for entity in query_results.entities {
            let data = entity.get::<GravityData>().unwrap();

            if !data.has_gravity {
                continue;
            }

            let gravity_force = Velocity {
                x: 0.0,
                y: -self.gravity,
                z: 0.0,
            };

            let mut forces = entity.get::<Forces>().unwrap().to_owned();
            forces.add_force(gravity_force);
            entity.set::<Forces>(forces);
        }

        None
    }
}
