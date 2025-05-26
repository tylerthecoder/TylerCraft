use std::cmp::min;

use crate::{
    components::{fine_world_pos::FineWorldPos, velocity::Velocity},
    direction::Direction,
    geometry::rotation::SphericalRotation,
    utils::js_log,
    vec::Vector3Ops,
    world::World,
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use super::{
    entity::{Entity, EntityQuery, EntityQueryResults},
    entity_action::{ActionData, EntityActionDto, EntityActionDtoMaker, EntityActionHandler},
    entity_component::impl_component,
    game::GameSchedule,
    game_script::GameScript,
    velocity_script::Forces,
};

#[wasm_bindgen]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MoveActionData {
    pub direction: Option<Direction>,
}

#[derive(Clone, Debug, Default)]
#[wasm_bindgen]
pub struct MoveAction {}
impl EntityActionDtoMaker<MoveActionData> for MoveAction {
    fn get_action_type_static() -> &'static str {
        "Move"
    }
}
impl EntityActionHandler for MoveAction {
    fn get_action_type(&self) -> &'static str {
        "Move"
    }

    fn handle_dto(
        &self,
        _world: &World,
        entity: &mut Entity,
        data: &EntityActionDto,
    ) -> GameSchedule {
        let data = data.get_data::<MoveActionData>().unwrap();
        entity.set::<MovingDirection>(data.direction);
        GameSchedule::empty()
    }
}

pub type MovingDirection = Option<Direction>;
impl_component!(MovingDirection);

#[derive(Debug)]
pub struct MoveScript {
    pub max_speed: f32,
}

impl Default for MoveScript {
    fn default() -> Self {
        Self { max_speed: 0.2 }
    }
}

impl GameScript for MoveScript {
    fn get_query(&self) -> EntityQuery {
        let mut query = EntityQuery::new();
        query.add::<Velocity>();
        query.add::<SphericalRotation>();
        query.add::<MovingDirection>();
        query.add::<Forces>();
        query
    }

    fn update(
        &mut self,
        _world: &crate::world::World,
        query_results: EntityQueryResults,
    ) -> Option<GameSchedule> {
        for entity in query_results.entities {
            let rot = entity.get::<SphericalRotation>().unwrap().to_owned();
            let moving_dir = entity.get::<MovingDirection>().unwrap().to_owned();
            let vel = entity.get::<Velocity>().unwrap().to_owned();
            let mut forces = entity.get::<Forces>().unwrap().to_owned();

            if moving_dir.is_some() {
                let direction_rot: SphericalRotation = moving_dir.unwrap().into();
                let move_rot = rot + direction_rot;
                let mut move_force: Velocity = move_rot.into();

                // check if this move force would make the player exceed the max speed, if so, scale the force down so it would make us reach the max speed once applied
                let final_vel = vel.add(&move_force);
                let max_vel = move_force.set_mag(self.max_speed);
                if final_vel.get_mag() > max_vel.get_mag() {
                    move_force = max_vel.sub(&vel);
                }

                // don't allow the player to move up or down
                move_force.y = 0.0;

                forces.add_force(move_force);
                entity.set::<Forces>(forces);
            } else {
                // If the player is moving, then slow them down by applying a force in the opposite direction of their velocity until they reach 0 velocity
                let mut new_forces = forces.forces.clone();
                let vel_mag = vel.get_mag();
                if vel_mag > 0.0 {
                    let slow_force_mag = f32::min(vel_mag, 0.1);
                    let mut slow_force = vel.set_mag(-slow_force_mag);
                    slow_force.y = 0.0;
                    new_forces.push(slow_force);
                }
                entity.set::<Forces>(Forces { forces: new_forces });
            }
        }

        None
    }
}

pub mod wasm {
    use crate::entities::entity::EntityId;

    use super::*;

    #[wasm_bindgen]
    impl MoveAction {
        pub fn make_wasm(entity_id: EntityId, direction: Option<Direction>) -> EntityActionDto {
            let data = MoveActionData { direction };
            MoveAction::make_dto(entity_id, data)
        }
    }
}
