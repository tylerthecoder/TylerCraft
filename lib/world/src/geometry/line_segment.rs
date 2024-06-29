use std::cmp::Ordering;

use crate::{
    chunk::chunk_mesh::BlockMesh, plane::WorldPlane, positions::FineWorldPos, world::World,
};

#[derive(Debug, PartialEq, Clone, Copy)]
pub struct LineSegment {
    pub start_pos: FineWorldPos,
    pub end_pos: FineWorldPos,
}

#[derive(Debug, PartialEq)]
pub struct LineSegmentIntersectionInfo {
    pub intersection_point: FineWorldPos,
    pub world_plane: WorldPlane,
    pub distance: f32,
}

impl LineSegment {
    pub fn length(&self) -> f32 {
        self.start_pos.distance_to(self.end_pos)
    }

    pub fn find_intersection(&self, plane: &WorldPlane) -> Option<FineWorldPos> {
        let axis = plane.direction.to_axis();
        let start = self.start_pos.get_component_from_axis(axis);
        let end = self.end_pos.get_component_from_axis(axis);
        let plane_pos = plane.get_relative_y() as f32;

        println!(
            "Axis: {}, start: {}, end: {}, plane_pos: {}",
            axis, start, end, plane_pos,
        );

        if start < plane_pos && end < plane_pos {
            return None;
        }

        if start > plane_pos && end > plane_pos {
            return None;
        }

        // t is the ratio of the distance from the start to the intersection point
        let t = (plane_pos - start) / (end - start);
        let slope = self.end_pos - self.start_pos;
        let scaled_slope = slope * t;
        let intersection_point = self.start_pos + scaled_slope;

        if plane.contains(intersection_point) {
            Some(intersection_point)
        } else {
            None
        }
    }

    pub fn find_intersection_with_block_mesh(
        &self,
        mesh: &BlockMesh,
    ) -> Option<LineSegmentIntersectionInfo> {
        mesh.into_iter()
            .filter_map(|world_plane| {
                println!("WORLD PLANE: {:?}", world_plane);
                self.find_intersection(&world_plane)
                    .map(|intersection_point| LineSegmentIntersectionInfo {
                        intersection_point,
                        world_plane,
                        distance: self.start_pos.distance_to(intersection_point),
                    })
            })
            // log the values
            .inspect(|info| {
                println!(
                    "Intersection Point: {:?}, World Plane: {:?}, Distance: {}",
                    info.intersection_point, info.world_plane, info.distance
                );
            })
            // Find the world plane that is closest
            .min_by(|a, b| {
                a.distance
                    .partial_cmp(&b.distance)
                    .unwrap_or_else(|| Ordering::Equal)
            })
    }
}

impl World {
    pub fn get_line_segment_intersection_info(
        &self,
        line_segment: LineSegment,
    ) -> Option<LineSegmentIntersectionInfo> {
        println!(
            "\nFinding intersection with line segment: {:?}",
            line_segment
        );

        for n in 0..(line_segment.length() + 1.0) as i32 {
            let slope = (line_segment.end_pos - line_segment.start_pos).set_mag(1.0);
            let marched_pos = line_segment.start_pos + slope * n as f32;

            let intersection_info = marched_pos
                .get_cube_vecs()
                .iter()
                .filter_map(|pos| {
                    self.get_mesh_at_pos(pos.to_world_pos())
                        // insert log
                        // .inspect(|mesh| {
                        //     println!("MESH: {:?}", mesh);
                        // })
                        .ok()
                        .map(|mesh| line_segment.find_intersection_with_block_mesh(&mesh))
                        .flatten()
                })
                .min_by(|a, b| {
                    a.distance
                        .partial_cmp(&b.distance)
                        .unwrap_or(std::cmp::Ordering::Equal)
                });

            println!("segment intersection info : {:?}", intersection_info);

            if intersection_info.is_some() {
                return intersection_info;
            }
        }
        None
    }
}

#[cfg(test)]
pub mod tests {
    use crate::{
        chunk::chunk_mesh::BlockMesh,
        direction::{Direction, Directions},
        plane::WorldPlane,
        positions::{FineWorldPos, WorldPos},
        vec::Vec3,
    };

    use super::{LineSegment, LineSegmentIntersectionInfo};

    #[test]
    fn test_find_intersection() {
        fn run_test(
            plane: WorldPlane,
            line_segment: LineSegment,
            expect_intersection: Option<FineWorldPos>,
        ) {
            let actual_intersection = line_segment.find_intersection(&plane);
            assert_eq!(actual_intersection, expect_intersection);
        }
        let plane = WorldPlane {
            world_pos: WorldPos::new(0, 0, 0),
            direction: Direction::Up,
        };

        let line_segment = LineSegment {
            start_pos: Vec3::new(0.5, 0.0, 0.5),
            end_pos: Vec3::new(0.5, 1.5, 0.5),
        };
        let expect_intersection = FineWorldPos {
            x: 0.5,
            y: 1.0,
            z: 0.5,
        };
        run_test(plane, line_segment, Some(expect_intersection));

        let plane = WorldPlane {
            world_pos: WorldPos::new(0, 0, 0),
            direction: Direction::Down,
        };

        let line_segment = LineSegment {
            start_pos: Vec3::new(0.2, 0.5, 0.2),
            end_pos: Vec3::new(0.4, -0.5, 0.4),
        };
        let expect_intersection = FineWorldPos {
            x: 0.3,
            y: 0.0,
            z: 0.3,
        };
        run_test(plane, line_segment, Some(expect_intersection));

        let plane = WorldPlane {
            world_pos: WorldPos::new(0, 0, 0),
            direction: Direction::East,
        };

        let line_segment = LineSegment {
            start_pos: Vec3::new(0.2, 0.5, 0.2),
            end_pos: Vec3::new(0.4, -0.5, 0.4),
        };
        let expect_intersection = None;
        run_test(plane, line_segment, expect_intersection);

        let plane = WorldPlane {
            world_pos: WorldPos::new(0, 0, 0),
            direction: Direction::East,
        };
        let line_segment = LineSegment {
            start_pos: Vec3::new(0.5, 0.5, 0.5),
            end_pos: Vec3::new(1.5, 0.5, 0.5),
        };
        let expect_intersection = FineWorldPos {
            x: 1.0,
            y: 0.5,
            z: 0.5,
        };
        run_test(plane, line_segment, Some(expect_intersection))
    }

    fn run_blockmesh_test(
        line_segment: LineSegment,
        block_mesh: BlockMesh,
        expect_intersection: Option<LineSegmentIntersectionInfo>,
    ) {
        let actual_intersection = line_segment.find_intersection_with_block_mesh(&block_mesh);
        assert_eq!(actual_intersection, expect_intersection);
    }

    #[test]
    fn test_find_intersection_with_blockmesh() {
        let line_segment = LineSegment {
            start_pos: Vec3::new(0.5, 0.0, 0.5),
            end_pos: Vec3::new(0.5, 1.5, 0.5),
        };

        let block_mesh = BlockMesh {
            world_pos: WorldPos::new(0, 0, 0),
            directions: Directions::empty(),
        };

        let expect_intersection_info = None;

        run_blockmesh_test(line_segment, block_mesh, expect_intersection_info);

        let line_segment = LineSegment {
            start_pos: Vec3::new(0.5, 2.0, 0.5),
            end_pos: Vec3::new(0.5, -1.0, 0.5),
        };

        let block_mesh = BlockMesh {
            world_pos: WorldPos::new(0, 0, 0),
            directions: [Direction::Up, Direction::Down].iter().cloned().collect(),
        };

        let expect_intersection_info = LineSegmentIntersectionInfo {
            world_plane: WorldPlane {
                world_pos: WorldPos::new(0, 0, 0),
                direction: Direction::Up,
            },
            distance: 1.0,
            intersection_point: FineWorldPos::new(0.5, 1.0, 0.5),
        };

        run_blockmesh_test(line_segment, block_mesh, Some(expect_intersection_info));

        run_blockmesh_test(
            LineSegment {
                start_pos: FineWorldPos {
                    x: 0.0,
                    y: 2.0,
                    z: 0.0,
                },
                end_pos: FineWorldPos {
                    x: 0.0,
                    y: 1.0,
                    z: 0.0,
                },
            },
            BlockMesh {
                world_pos: WorldPos::new(0, 0, 0),
                directions: [Direction::Up, Direction::Down].iter().cloned().collect(),
            },
            Some(LineSegmentIntersectionInfo {
                world_plane: WorldPlane {
                    world_pos: WorldPos::new(0, 0, 0),
                    direction: Direction::Up,
                },
                distance: 1.0,
                intersection_point: FineWorldPos::new(0.0, 1.0, 0.0),
            }),
        )
    }

    #[test]
    fn test_segment_above_mesh() {
        run_blockmesh_test(
            LineSegment {
                start_pos: FineWorldPos {
                    x: 0.0,
                    y: 1.1,
                    z: 0.0,
                },
                end_pos: FineWorldPos {
                    x: 0.3,
                    y: 2.0,
                    z: -0.3,
                },
            },
            BlockMesh {
                world_pos: WorldPos::new(0, 0, 0),
                directions: [Direction::Up, Direction::Down].iter().cloned().collect(),
            },
            None,
        )
    }
}
