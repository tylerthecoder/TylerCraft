use super::{
    line_segment::{self, LineSegment},
    rotation::SphericalRotation,
};
use crate::{
    chunk::chunk_mesh::BlockMesh,
    direction::Direction,
    plane::WorldPlane,
    positions::FineWorldPos,
    vec::Vec3,
    world::{world_block::WorldBlock, World},
};
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

#[derive(PartialEq, Debug, Serialize, Deserialize)]
pub struct LookingAt {
    /**
     * The block a camera is pointing at
    	*/
    block: WorldBlock,
    /**
     * The face of the block that is being looked at
     */
    face: Direction,
    /**
     * How far the face is away from the camera
     */
    distance: f32,
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

impl World {
    pub fn get_pointed_at_block(&self, ray: Ray) -> Option<LookingAt> {
        let line_segment = LineSegment {
            start_pos: ray.pos,
            end_pos: ray.move_forward(13.0).pos,
        };

        self.get_intersecting_blocks(line_segment)
            .map(|info| LookingAt {
                block: self.get_block(&info.world_plane.world_pos),
                face: info.world_plane.direction,
                distance: info.distance,
            })
    }
}

#[cfg(test)]
mod tests {
    use super::{LookingAt, Ray};
    use crate::{
        block::{BlockData, BlockType},
        chunk::{chunk_mesh::BlockMesh, Chunk},
        direction::{Direction, Directions},
        geometry::rotation::SphericalRotation,
        plane::WorldPlane,
        positions::{FineWorldPos, WorldPos},
        world::{world_block::WorldBlock, World},
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
            rot: SphericalRotation {
                theta: 0.03720367320505069,
                phi: 0.2720000000000098,
            },
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

    fn finds_block_being_pointed_at(block: &WorldBlock, ray: Ray, expected: LookingAt) -> () {
        let mut world = World::default();
        let chunk = Chunk::new(block.world_pos.to_chunk_pos());
        world.insert_chunk(chunk);
        world.add_block(&block).unwrap();
        let actual = world.get_pointed_at_block(ray);

        assert_eq!(actual, Some(expected));
    }

    #[test]
    fn test_pointing_at() {
        let block = WorldBlock {
            world_pos: WorldPos::new(0, 0, 0),
            block_type: BlockType::Stone,
            extra_data: BlockData::None,
        };

        self::finds_block_being_pointed_at(
            &block,
            Ray {
                pos: FineWorldPos::new(0.5, 1.5, 0.5),
                rot: Direction::Down.into(),
            },
            LookingAt {
                block,
                face: Direction::Up,
                distance: 0.5,
            },
        );

        let block = WorldBlock {
            world_pos: WorldPos::new(2, 0, 0),
            block_type: BlockType::Stone,
            extra_data: BlockData::None,
        };

        self::finds_block_being_pointed_at(
            &block,
            Ray {
                pos: FineWorldPos::new(0.5, 0.5, 0.5),
                rot: Direction::East.into(),
            },
            LookingAt {
                block,
                face: Direction::West,
                distance: 1.5,
            },
        )
    }
}
