use wasm_bindgen::prelude::*;
use crate::{components::{fine_world_pos::FineWorldPos, velocity::Velocity}, direction::Direction, geometry::rotation::SphericalRotation};

use super::{entity::{Entity, EntityQuery, EntityQueryResults}, entity_action::{ActionData, EntityActionDto, EntityActionHandler, EntityActionDtoMaker}, entity_component::impl_component, game::GameSchedule, game_script::GameScript};

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct MoveActionData {
    pub direction: Direction,
}

#[derive(Clone, Debug, Default)]
pub struct MoveAction { }
impl EntityActionDtoMaker<MoveActionData> for MoveAction {
    fn get_action_type_static() -> &'static str {
        "Move"
    }
}
impl EntityActionHandler for MoveAction {
    fn get_action_type(&self) -> &'static str {
        "Move"
    }

    fn handle_dto(&self, entity: &mut Entity, data: &EntityActionDto) {
        let data = data.get_data::<MoveActionData>().unwrap();
        entity.set::<MovingDirection>(Some(data.direction));
    }
}

pub type MovingDirection = Option<Direction>;
impl_component!(MovingDirection);

#[derive(Debug, Default)]
pub struct MoveScript { }

impl GameScript for MoveScript {

    fn get_query(&self) -> EntityQuery {
        let mut query = EntityQuery::new();
        query.add::<Velocity>();
        query.add::<SphericalRotation>();
        query.add::<MovingDirection>();
        query
    }

    fn update(&mut self, _world: &crate::world::World, query_results: EntityQueryResults) -> Option<GameSchedule> {
        for entity in query_results.entities {
            let rot = entity.get::<SphericalRotation>().unwrap().to_owned();
            let moving_dir = entity.get::<MovingDirection>().unwrap().to_owned();

            println!("moving dir: {:?}", moving_dir);

            if moving_dir.is_some() {
                let new_vel: Velocity = rot.into();
                entity.set::<Velocity>(new_vel);
            }
        }

        None
    }
}