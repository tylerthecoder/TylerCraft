use serde::{Deserialize, Serialize};

use crate::{
    components::{fine_world_pos::FineWorldPos, size3::Size3, velocity::Velocity},
    geometry::rect3::Rect3,
    utils::js_log,
    vec::Vector3Ops,
};

use super::{
    entity::{EntityQuery, EntityQueryResults},
    entity_component::impl_component,
    game::GameSchedule,
    game_script::GameScript,
};

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
pub struct Forces {
    pub forces: Vec<Velocity>,
}

impl_component!(Forces);

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
            let mut vel = entity.get::<Velocity>().unwrap().to_owned();
            let pos = entity.get::<FineWorldPos>().unwrap().to_owned();
            let forces = entity.get::<Forces>().unwrap().to_owned();

            for force in forces.forces.iter() {
                vel = vel.add(force);
            }

            let player_rect = Rect3 {
                pos,
                dim: Size3 {
                    x: 1.0,
                    y: 1.0,
                    z: 1.0,
                },
            };

            let new_pos = world.move_rect3(&player_rect, pos + vel);
            let intersection_info =
                world.get_moving_rect3_intersection_info(&player_rect, pos + vel);

            js_log(&format!(
                "entity_id: {:?} pos: {:?}, vel: {:?}, new_pos: {:?}, intersection_info: {:?}",
                entity.id, pos, vel, new_pos, intersection_info,
            ));
            for force in forces.forces.iter() {
                js_log(&format!("force: {:?}", force));
            }

            if new_pos.y < 1.0 {
                panic!("player fell through the world");
            }

            entity.set::<FineWorldPos>(new_pos);
            entity.set::<Velocity>(vel);
            entity.set::<Forces>(Forces { forces: vec![] });
        }

        None
    }
}
