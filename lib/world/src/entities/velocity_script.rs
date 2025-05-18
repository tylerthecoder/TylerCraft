use crate::{
    components::{fine_world_pos::FineWorldPos, size3::Size3, velocity::Velocity},
    geometry::rect3::Rect3,
};

use super::{
    entity::{EntityQuery, EntityQueryResults},
    game::GameSchedule,
    game_script::GameScript,
};

#[derive(Debug, Default)]
pub struct VelocityScript {}

impl GameScript for VelocityScript {
    fn get_query(&self) -> EntityQuery {
        let mut query = EntityQuery::new();
        query.add::<Velocity>();
        query.add::<FineWorldPos>();
        query
    }

    fn update(
        &mut self,
        world: &crate::world::World,
        query_results: EntityQueryResults,
    ) -> Option<GameSchedule> {
        for entity in query_results.entities {
            let vel = entity.get::<Velocity>().unwrap().to_owned();
            let pos = entity.get::<FineWorldPos>().unwrap().to_owned();

            println!("entity_id: {:?} pos: {:?}, vel: {:?}", entity.id, pos, vel);

            let player_rect = Rect3 {
                pos,
                dim: Size3 {
                    x: 1.0,
                    y: 1.0,
                    z: 1.0,
                },
            };

            let new_pos = world.move_rect3(&player_rect, pos + vel);

            entity.set::<FineWorldPos>(new_pos);
        }

        None
    }
}
