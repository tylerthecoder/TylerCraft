use crate::components::{fine_world_pos::FineWorldPos, velocity::Velocity};

use super::{entity::{EntityQuery, EntityQueryResults}, game::GameSchedule, game_script::GameScript};


#[derive(Debug, Default)]
pub struct VelocityScript { }

impl GameScript for VelocityScript {
    fn get_query(&self) -> EntityQuery {
        let mut query = EntityQuery::new();
        query.add::<Velocity>();
        query.add::<FineWorldPos>();
        query
    }

    fn update(&mut self, _world: &crate::world::World, query_results: EntityQueryResults) -> Option<GameSchedule> {
        for entity in query_results.entities {
            let vel = entity.get::<Velocity>().unwrap().to_owned();
            let pos = entity.get::<FineWorldPos>().unwrap().to_owned();

            println!("entity_id: {:?} pos: {:?}, vel: {:?}", entity.id, pos, vel);

            let new_pos = pos + vel;

            entity.set::<FineWorldPos>(new_pos);
        }

        None
    }
}