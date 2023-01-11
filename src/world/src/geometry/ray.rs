use super::rotation::SphericalRotation;
use crate::{plane::WorldPlane, positions::FineWorldPos};
use serde::{Deserialize, Serialize};
use std::borrow::BorrowMut;

#[derive(Serialize, Deserialize)]
pub struct Ray {
    pub pos: FineWorldPos,
    /**
     * The direction the camera is rotated.
     * i.e. which way it is t.
     */
    pub rot: SphericalRotation,
}

impl Ray {
    pub fn move_forward_mut(&mut self, amount: f32) {
        self.pos = self.rot.borrow_mut().to_unit_vector().scalar_mult(amount)
    }

    pub fn move_forward(&self, amount: f32) -> Ray {
        Ray {
            pos: self
                .pos
                .add_vec(self.rot.to_unit_vector().scalar_mult(amount)),
            rot: self.rot,
        }
    }

    pub fn distance_from_plane(&self, plane: &WorldPlane) -> Option<f32> {
        // Find the time "t" which the line intersects the plane.
        // The dimension that the plane is in is checked is used
        // PlanePos[dim] = CameraPos[dim] + t * CameraRotation
        // t = (PlanePos[dim] - CameraPos[dim]) / CameraRotation

        let t = (plane
            .world_pos
            .get_component_from_direction(plane.direction) as f32
            - self.pos.get_component_from_direction(plane.direction))
            / self
                .rot
                .to_unit_vector()
                .get_component_from_direction(plane.direction);

        // Now find the actual position
        let intersect_pos = self.pos.add_vec(self.rot.to_unit_vector().scalar_mult(t));

        if plane.contains(intersect_pos) {
            Some(self.pos.distance_to(intersect_pos))
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Ray;
    use crate::{
        direction::Direction,
        geometry::rotation::SphericalRotation,
        plane::WorldPlane,
        positions::{FineWorldPos, WorldPos},
    };

    #[test]
    fn test_distance_from_plane() {
        let ray = Ray {
            pos: FineWorldPos::new(0.0, 0.0, 0.0),
            rot: SphericalRotation::new(0.0, 0.0),
        };
        let world_plane = WorldPlane::new(WorldPos::new(3, 0, 0), Direction::West);

        assert_eq!(ray.distance_from_plane(&world_plane), Some(3.0));

        let ray = Ray {
            pos: FineWorldPos::new(0.0, 0.0, 0.0),
            rot: SphericalRotation::new(0.0, 0.0),
        };
        let world_plane = WorldPlane::new(WorldPos::new(3, 0, 0), Direction::North);

        assert_eq!(ray.distance_from_plane(&world_plane), None);
    }
}
