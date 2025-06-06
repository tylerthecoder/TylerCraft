use super::{
    entities::{EntityQuery, EntityQueryResults},
    entity_component::impl_component,
    game::GameSchedule,
    game_script::GameScript,
};
use crate::{
    components::{fine_world_pos::FineWorldPos, size3::Size3, velocity::Velocity},
    geometry::rect3::Rect3,
    vec::Vector3Ops,
};
use serde::{Deserialize, Serialize};
use serde_json;
use serde_wasm_bindgen;
use wasm_bindgen::JsValue;

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
pub struct Forces {
    pub forces: Vec<Velocity>,
}

impl Forces {
    pub fn add_force(&mut self, force: Velocity) {
        self.forces.push(force);
    }
}

impl_component!(Forces);

#[derive(Debug, Default)]
pub struct VelocityScript {}

impl GameScript for VelocityScript {
    fn get_name(&self) -> String {
        "velocity".to_string()
    }

    fn get_config(&self) -> JsValue {
        let config = serde_json::json!({
            "enabled": true,
            "max_velocity": 10.0,
            "damping_factor": 0.98
        });
        serde_wasm_bindgen::to_value(&config).unwrap()
    }

    fn set_config(&mut self, config: JsValue) {
        web_sys::console::log_1(&format!("VelocityScript config updated: {:?}", config).into());
    }

    fn get_query(&self) -> EntityQuery {
        let mut query = EntityQuery::new();
        query.add::<Velocity>();
        query.add::<FineWorldPos>();
        query.add::<Size3>();
        query
    }

    fn update(
        &mut self,
        world: &crate::world::World,
        query_results: EntityQueryResults,
    ) -> Option<GameSchedule> {
        for entity in query_results.entities {
            let mut vel = entity.get::<Velocity>().unwrap().to_owned();
            let pos = entity.get::<FineWorldPos>().unwrap().to_owned();
            let size = entity.get::<Size3>().unwrap().to_owned();
            let forces = entity.get::<Forces>().unwrap().to_owned();

            for force in forces.forces.iter() {
                vel = vel.add(force);
            }

            let player_rect = Rect3 { pos, dim: size };

            let end_pos = pos + vel;

            let new_pos = world.move_rect3(&player_rect, end_pos);

            let pos_diff = new_pos.sub(&pos);
            let real_vel = Velocity {
                x: pos_diff.x,
                y: pos_diff.y,
                z: pos_diff.z,
            };

            entity.set::<FineWorldPos>(new_pos);
            entity.set::<Velocity>(real_vel);
            entity.set::<Forces>(Forces { forces: vec![] });
        }

        None
    }
}
