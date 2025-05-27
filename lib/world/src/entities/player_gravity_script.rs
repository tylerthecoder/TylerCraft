use super::{
    entities::{EntityQuery, EntityQueryResults},
    entity_component::impl_component,
    game::GameSchedule,
    game_script::GameScript,
    velocity_script::Forces,
};
use crate::{components::velocity::Velocity, world::World};
use serde::{Deserialize, Serialize};

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
