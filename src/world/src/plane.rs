use crate::{
    direction::Direction,
    positions::{FineWorldPos, WorldPos},
};

#[derive(Debug, PartialEq)]
pub struct WorldPlane {
    pub world_pos: WorldPos,
    pub direction: Direction,
}

impl WorldPlane {
    pub fn new(world_pos: WorldPos, direction: Direction) -> WorldPlane {
        WorldPlane {
            world_pos,
            direction,
        }
    }

    pub fn contains(&self, pos: FineWorldPos) -> bool {
        // Check that the planar component is within some threshold
        let contains_planar = (pos.get_component_from_direction(self.direction)
            - pos.get_component_from_direction(self.direction))
        .abs()
            < 0.01;

        let others = self
            .world_pos
            .get_opposite_components_from_direction(self.direction);
        let compare_others = pos.get_opposite_components_from_direction(self.direction);

        let contains_0 = (others.0 as f32 - compare_others.0).abs() < 1.0;
        let contains_1 = (others.1 as f32 - compare_others.1).abs() < 1.0;

        contains_planar && contains_0 && contains_1
    }
}
