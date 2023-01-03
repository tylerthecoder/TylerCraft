use crate::{
    camera::Camera,
    direction::Direction,
    positions::{FineWorldPos, WorldPos},
};

struct WorldPlane {
    world_pos: WorldPos,
    direction: Direction,
}

impl WorldPlane {
    pub fn looking_at(&self, camera: Camera) -> bool {
        // Find the time "t" which the line intersects the plane.
        // The dimension that the plane is in is checked is used
        // PlanePos[dim] = CameraPos[dim] + t * CameraRotation
        // t = (PlanePos[dim] - CameraPos[dim]) / CameraRotation

        let t = (self.world_pos.get_component_from_direction(self.direction) as f32
            - camera.pos.get_component_from_direction(self.direction))
            / camera
                .rot
                .to_unit_vector()
                .get_component_from_direction(self.direction);

        // Now find the actual position
        let intersect_pos = camera
            .pos
            .add_vec(camera.rot.to_unit_vector().scalar_mult(t));

        self.contains(intersect_pos)
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
