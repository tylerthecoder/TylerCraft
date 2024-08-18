use crate::{direction::Direction, geometry::{rotation::SphericalRotation, velocity::Velocity}};
use wasm_bindgen::prelude::*;
use super::{entity::{Entity, EntityId, EntityQuery, EntityQueryResults}, entity_action::{EntityAction, EntityActionDto}, entity_component::impl_component, game::GameSchedule, game_script::GameScript};

#[wasm_bindgen]
pub struct PlayerMoveAction {
    pub entity_id: super::entity::EntityId,
    pub direction: crate::direction::Direction,
}

impl EntityAction for PlayerMoveAction {
    fn entity_id(&self) -> EntityId {
        self.entity_id
    }

    fn get_name(&self) -> &'static str {
        "player_move"
    }

    fn get_dto(&self) -> EntityActionDto {
        EntityActionDto {
            entity_id: self.entity_id,
            name: self.get_name(),
            data: Box::new(self.direction),
        }
    }

    fn handle(&self, entity: &mut Entity) {
        entity.set::<MovingDirection>(Some(self.direction));
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

