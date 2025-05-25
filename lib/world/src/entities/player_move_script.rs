use crate::{
    components::{fine_world_pos::FineWorldPos, velocity::Velocity},
    direction::Direction,
    geometry::rotation::SphericalRotation,
    utils::js_log,
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

#[derive(Debug, Default)]
pub struct MoveScript {}

impl GameScript for MoveScript {
    fn get_query(&self) -> EntityQuery {
        let mut query = EntityQuery::new();
        query.add::<Velocity>();
        query.add::<SphericalRotation>();
        query.add::<MovingDirection>();
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

            if moving_dir.is_some() {
                let direction_rot: SphericalRotation = moving_dir.unwrap().into();
                let move_rot = rot + direction_rot;
                let new_vel: Velocity = move_rot.into();
                entity.set::<Velocity>(new_vel);
            } else {
                let new_vel: Velocity = Velocity {
                    x: 0.0,
                    y: 0.0,
                    z: 0.0,
                };
                entity.set::<Velocity>(new_vel);
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
