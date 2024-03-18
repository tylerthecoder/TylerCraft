use super::rotation::SphericalRotation;
use crate::{chunk::chunk_mesh::BlockMesh, plane::WorldPlane, positions::FineWorldPos, vec::Vec3, direction::Direction};
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;

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
        let rot_vec: Vec3<f32> = self.rot.into();
        self.pos = rot_vec.scalar_mult(amount)
    }

    pub fn move_forward(&self, amount: f32) -> Ray {
        let rot_vec: Vec3<f32> = self.rot.into();
        Ray {
            pos: self.pos.add_vec(rot_vec.scalar_mult(amount)),
            rot: self.rot,
        }
    }

    pub fn distance_from_block_mesh(&self, block_mesh: &BlockMesh) -> Option<(WorldPlane, f32)> {
        block_mesh
            .into_iter()
            .filter_map(|plane| {
                println!("plane: {:?}", plane);
                self.distance_from_plane(&plane)
                    .map(|distance| (plane, distance))
            })
            .min_by(|(_plane_a, dist_a), (_plane_b, dist_b)| {
                dist_a.partial_cmp(dist_b).unwrap_or(Ordering::Equal)
            })
    }

    pub fn distance_from_plane(&self, plane: &WorldPlane) -> Option<f32> {
        // Find the time "t" which the line intersects the plane.
        // The dimension that the plane is in is checked is used
        // PlanePos[dim] = CameraPos[dim] + t * CameraRotation
        // t = (PlanePos[dim] - CameraPos[dim]) / CameraRotation

        let rot_vec: Vec3<f32> = self.rot.into();

        let t = (plane.get_relative_y() as f32
            - self.pos.get_component_from_direction(plane.direction))
            / rot_vec.get_component_from_direction(plane.direction);

        // Now find the actual position
        let intersect_pos = self.pos.add_vec(rot_vec.scalar_mult(t));

        if plane.contains(intersect_pos) {
            Some(self.pos.distance_to(intersect_pos))
        } else {
            None
        }
    }
}


pub struct DirectionRay {
    pub direction: Direction,
    pub length: f32
}


#[cfg(test)]
mod tests {
    use super::Ray;
    use crate::{
        chunk::chunk_mesh::BlockMesh,
        direction::{Direction, Directions},
        plane::WorldPlane,
        positions::{FineWorldPos, WorldPos}, geometry::rotation::SphericalRotation,
    };

    #[test]
    fn test_distance_from_plane() {
        let ray = Ray {
            pos: FineWorldPos::new(0.0, 0.0, 0.0),
            rot: Direction::East.into(),
        };
        let world_plane = WorldPlane::new(WorldPos::new(5, 0, 0), Direction::East);

        assert_eq!(ray.distance_from_plane(&world_plane), Some(6.0));

        let ray = Ray {
            pos: FineWorldPos::new(0.0, 0.0, 0.0),
            rot: Direction::Up.into(),
        };
        let world_plane = WorldPlane::new(WorldPos::new(0, 3, 0), Direction::Up);

        assert_eq!(ray.distance_from_plane(&world_plane), Some(4.0));

        let ray = Ray {
            pos: FineWorldPos::new(0.0, 0.0, 0.0),
            rot: Direction::North.into(),
        };
        let world_plane = WorldPlane::new(WorldPos::new(0, 0, 3), Direction::North);

        assert_eq!(ray.distance_from_plane(&world_plane), Some(4.0));

        let ray = Ray {
            pos: FineWorldPos::new(0.5, 0.5, 0.5),
            rot: Direction::Down.into(),
        };
        let world_plane = WorldPlane::new(WorldPos::new(0, 0, 0), Direction::Up);

        assert_eq!(ray.distance_from_plane(&world_plane), Some(0.5));

        let ray = Ray {
            pos: FineWorldPos::new(0.5, 0.5, 0.5),
            rot: Direction::Down.into(),
        };
        let world_plane = WorldPlane::new(WorldPos::new(1, 0, 1), Direction::Up);

        assert_eq!(ray.distance_from_plane(&world_plane), None);

        let ray = Ray {
            pos: FineWorldPos::new(0.5, 0.5, 0.5),
            rot: Direction::Down.into(),
        };
        let world_plane = WorldPlane::new(WorldPos::new(1, 0, 1), Direction::Up);

        assert_eq!(ray.distance_from_plane(&world_plane), None);


        let ray = Ray {
            pos: FineWorldPos::new(-3.7103435802557425, 2.8, 11.354942113622975),
            rot: SphericalRotation { theta: 0.03720367320505069, phi: 0.2720000000000098 }
        };
        let world_plane = WorldPlane::new(WorldPos::new(-4, 0, 17), Direction::Up);
        let distance = ray.distance_from_plane(&world_plane);

        println!("The Distance: {:?}", distance);


    }

    #[test]
    fn distance_from_block_mesh() {
        fn run_test(
            ray: Ray,
            block_mesh: BlockMesh,
            expected_plane: WorldPlane,
            expected_distance: f32,
        ) {
            let (plane, distance) = ray.distance_from_block_mesh(&block_mesh).unwrap();

            assert_eq!(plane, expected_plane);
            assert_eq!(distance, expected_distance);
        }

        run_test(
            Ray {
                pos: FineWorldPos::new(0.5, 3.0, 0.5),
                rot: Direction::Down.into(),
            },
            BlockMesh {
                directions: Directions::create_for_direction(Direction::Up),
                world_pos: WorldPos::new(0, 0, 0),
            },
            WorldPlane {
                world_pos: WorldPos::new(0, 0, 0),
                direction: Direction::Up,
            },
            2.0,
        );
    }
}
