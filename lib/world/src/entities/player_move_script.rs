use crate::{direction::Direction, geometry::{rotation::SphericalRotation, velocity::Velocity}};
use wasm_bindgen::prelude::*;
use super::{entity::{Entity, EntityQuery, EntityQueryResults}, entity_action::{ActionData, EntityActionDto, EntityActionHandler, EntityActionDtoMaker}, entity_component::impl_component, game::GameSchedule, game_script::GameScript};

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct MoveActionData {
    pub direction: Direction,
}

pub struct MoveAction { }
impl EntityActionDtoMaker<MoveActionData> for MoveAction {
    fn get_action_type_static() -> &'static str {
        "PlayerMove"
    }
}
impl EntityActionHandler for MoveAction {
    fn get_action_type(&self) -> &'static str {
        "PlayerMove"
    }

    fn handle_dto(&self, entity: &mut Entity, data: &EntityActionDto) {
        let data = data.get_data::<MoveActionData>().unwrap();
        entity.set::<MovingDirection>(Some(data.direction));
    }
}

pub type MovingDirection = Option<Direction>;
impl_component!(MovingDirection);

#[derive(Debug)]
pub struct PlayerMoveScript { }

impl GameScript for PlayerMoveScript {

    fn get_query(&self) -> EntityQuery {
        let mut query = EntityQuery::new();
        query.add::<Velocity>();
        query.add::<SphericalRotation>();
        query.add::<MovingDirection>();
        query
    }

    fn update(&mut self, world: &crate::world::World, query_results: EntityQueryResults) -> Option<GameSchedule> {
        for entity in query_results.entities {
            let mut new_rot = entity.get::<SphericalRotation>().unwrap();
            let moving_dir = entity.get::<MovingDirection>().unwrap();
            let vel = entity.get::<Velocity>().unwrap().to_owned();

            // let force = moving_dir.into();

            let new_vel = vel;

            entity.set::<Velocity>(new_vel);
        }

        None
    }
}

