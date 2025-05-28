use super::{
    entities::{EntityQuery, EntityQueryResults},
    entity::{make_entity_id, Entity},
    game::GameSchedule,
    game_script::GameScript,
    player::Health,
    velocity_script::Forces,
};
use crate::{
    components::{fine_world_pos::FineWorldPos, size3::Size3, velocity::Velocity},
    geometry::rect3::Rect3,
    utils::js_log,
};
use wasm_bindgen::prelude::wasm_bindgen;

pub fn make_fireball(pos: FineWorldPos, vel: Velocity) -> Entity {
    let uid = make_entity_id();
    let mut ent = Entity::new(uid, "fireball".to_string());
    ent.add::<FineWorldPos>(pos);
    ent.add::<Velocity>(vel);
    ent.add::<Size3>(Size3 {
        x: 1.0,
        y: 1.0,
        z: 1.0,
    });
    ent.add::<Forces>(Forces { forces: vec![] });
    ent
}

#[wasm_bindgen]
pub struct Fireball {
    pub pos: FineWorldPos,
    pub vel: Velocity,
    pub dim: Size3,
}

#[wasm_bindgen]
impl Fireball {
    pub fn from_entity(entity: Entity) -> Fireball {
        Fireball {
            pos: entity.get::<FineWorldPos>().unwrap().clone(),
            vel: entity.get::<Velocity>().unwrap().clone(),
            dim: entity.get::<Size3>().unwrap().clone(),
        }
    }

    pub fn is_fireball(entity: &Entity) -> bool {
        entity.name == "fireball"
    }
}

// Make a gamescript that checks for collisions between fireballs and other entities.

#[derive(Debug, Default)]
pub struct FireballScript {}

impl GameScript for FireballScript {
    fn get_query(&self) -> EntityQuery {
        let mut query = EntityQuery::new();
        query.add::<FineWorldPos>();
        query.add::<Size3>();
        query
    }

    fn update(
        &mut self,
        world: &crate::world::World,
        mut query_results: EntityQueryResults,
    ) -> Option<GameSchedule> {
        let mut game_schedule = GameSchedule::empty();

        // First, collect all the fireball data and other entity data to avoid borrow conflicts
        let mut fireball_data = Vec::new();
        let mut other_entity_data = Vec::new();

        for entity in &query_results.entities {
            if Fireball::is_fireball(entity) {
                if let (Some(vel), Some(pos), Some(dim)) = (
                    entity.get::<Velocity>(),
                    entity.get::<FineWorldPos>(),
                    entity.get::<Size3>(),
                ) {
                    fireball_data.push((entity.id, vel.clone(), pos.clone(), dim.clone()));
                }
            } else {
                if let (Some(pos), Some(dim)) =
                    (entity.get::<FineWorldPos>(), entity.get::<Size3>())
                {
                    other_entity_data.push((entity.id, pos.clone(), dim.clone()));
                }
            }
        }

        // Process fireball collisions with blocks
        for (fireball_id, vel, pos, dim) in &fireball_data {
            let fireball_rect = Rect3 {
                pos: *pos,
                dim: *dim,
            };
            let fireball_end_pos = *pos + *vel;

            let intersection_info =
                world.get_moving_rect3_intersection_info(&fireball_rect, fireball_end_pos);

            if let Some(intersection_info) = intersection_info {
                let intersecting_block_pos = intersection_info.world_plane.world_pos;
                game_schedule.remove_block(intersecting_block_pos);
                game_schedule.remove_entity(*fireball_id);
            }
        }

        // Process fireball collisions with other entities
        for (fireball_id, _vel, fireball_pos, fireball_dim) in &fireball_data {
            let fireball_rect = Rect3 {
                pos: *fireball_pos,
                dim: *fireball_dim,
            };

            for (other_entity_id, other_pos, other_dim) in &other_entity_data {
                if fireball_id == other_entity_id {
                    continue;
                }

                let entity2_rect = Rect3 {
                    pos: *other_pos,
                    dim: *other_dim,
                };

                if entity2_rect.does_intersect(&fireball_rect) {
                    js_log(format!("fireball hit entity: {:?}", other_entity_id).as_str());
                    game_schedule.remove_entity(*fireball_id);

                    // Find the entity to update its health
                    for entity in &mut query_results.entities {
                        if entity.id == *other_entity_id {
                            if let Some(health) = entity.get::<Health>() {
                                let new_health = health.health - 10;
                                entity.set::<Health>(Health {
                                    health: new_health,
                                    max_health: health.max_health,
                                });
                            }
                            break;
                        }
                    }
                }
            }
        }

        Some(game_schedule)
    }
}
