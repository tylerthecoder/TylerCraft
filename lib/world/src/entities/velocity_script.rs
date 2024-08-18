use crate::{geometry::velocity::Velocity, positions::{FineWorldPos, WorldPos}};
use super::{entity::{EntityQuery, EntityQueryResults}, entity_action::EntityAction, game::GameSchedule, game_script::GameScript};


#[derive(Debug)]
struct VelocityScript { }

impl GameScript for VelocityScript {
    fn get_query(&self) -> EntityQuery {
        super::entity::EntityQuery::new()
    }

    fn update(&mut self, _world: &crate::world::World, query_results: EntityQueryResults) -> Option<GameSchedule> {
        for entity in query_results.entities {
            let vel = entity.get::<Velocity>().unwrap().to_owned();
            let pos = entity.get::<FineWorldPos>().unwrap().to_owned();

            let new_pos = pos + vel;

            entity.set::<FineWorldPos>(new_pos);
        }

        None
    }
}