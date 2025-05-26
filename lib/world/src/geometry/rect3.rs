use crate::components::fine_world_pos::FineWorldPos;
use crate::components::size3::Size3;
use crate::components::world_pos::WorldPos;
use crate::direction::DirectionVectorExtension;
use crate::utils::js_log;
use crate::vec::Vector3Ops;
use crate::world::World;

use super::line_segment::{LineSegment, LineSegmentIntersectionInfo};
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::{from_value, to_value};
use std::cmp::Ordering;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, Copy)]
pub struct Rect3 {
    pub pos: FineWorldPos,
    pub dim: Size3,
}

static DISTANCE_EPSILON: f32 = 0.01;

impl Rect3 {
    pub fn get_all_points(&self) -> [FineWorldPos; 8] {
        let x = self.pos.x;
        let y = self.pos.y;
        let z = self.pos.z;
        let dx = self.dim.x;
        let dy = self.dim.y;
        let dz = self.dim.z;
        [
            FineWorldPos::new(x, y, z),
            FineWorldPos::new(x + dx, y, z),
            FineWorldPos::new(x, y + dy, z),
            FineWorldPos::new(x + dx, y + dy, z),
            FineWorldPos::new(x, y, z + dz),
            FineWorldPos::new(x + dx, y, z + dz),
            FineWorldPos::new(x, y + dy, z + dz),
            FineWorldPos::new(x + dx, y + dy, z + dz),
        ]
    }

    pub fn get_all_line_segments(&self) -> [LineSegment; 12] {
        let x = self.pos.x;
        let y = self.pos.y;
        let z = self.pos.z;
        let dx = self.dim.x;
        let dy = self.dim.y;
        let dz = self.dim.z;
        [
            LineSegment {
                start_pos: FineWorldPos::new(x, y, z),
                end_pos: FineWorldPos::new(x + dx, y, z),
            },
            LineSegment {
                start_pos: FineWorldPos::new(x, y, z),
                end_pos: FineWorldPos::new(x, y + dy, z),
            },
            LineSegment {
                start_pos: FineWorldPos::new(x, y, z),
                end_pos: FineWorldPos::new(x, y, z + dz),
            },
            LineSegment {
                start_pos: FineWorldPos::new(x + dx, y, z),
                end_pos: FineWorldPos::new(x + dx, y + dy, z),
            },
            LineSegment {
                start_pos: FineWorldPos::new(x + dx, y, z),
                end_pos: FineWorldPos::new(x + dx, y, z + dz),
            },
            LineSegment {
                start_pos: FineWorldPos::new(x, y + dy, z),
                end_pos: FineWorldPos::new(x + dx, y + dy, z),
            },
            LineSegment {
                start_pos: FineWorldPos::new(x, y + dy, z),
                end_pos: FineWorldPos::new(x, y + dy, z + dz),
            },
            LineSegment {
                start_pos: FineWorldPos::new(x, y, z + dz),
                end_pos: FineWorldPos::new(x + dx, y, z + dz),
            },
            LineSegment {
                start_pos: FineWorldPos::new(x, y, z + dz),
                end_pos: FineWorldPos::new(x, y + dy, z + dz),
            },
            LineSegment {
                start_pos: FineWorldPos::new(x + dx, y + dy, z),
                end_pos: FineWorldPos::new(x + dx, y + dy, z + dz),
            },
            LineSegment {
                start_pos: FineWorldPos::new(x, y + dy, z + dz),
                end_pos: FineWorldPos::new(x + dx, y + dy, z + dz),
            },
            LineSegment {
                start_pos: FineWorldPos::new(x + dx, y, z + dz),
                end_pos: FineWorldPos::new(x + dx, y + dy, z + dz),
            },
        ]
    }
}

impl World {
    pub fn get_rect3_intersection_infos(
        &self,
        rect: &Rect3,
        end_pos: FineWorldPos,
    ) -> Vec<LineSegmentIntersectionInfo> {
        let diff = end_pos.sub(&rect.pos);

        let line_segments = rect.get_all_points().map(|point| LineSegment {
            start_pos: point,
            end_pos: point.add(&diff),
        });

        line_segments
            .iter()
            .filter_map(|seg| self.get_line_segment_intersection_info(*seg))
            .collect()
    }

    pub fn get_moving_rect3_intersection_info(
        &self,
        rect: &Rect3,
        end_pos: FineWorldPos,
    ) -> Option<LineSegmentIntersectionInfo> {
        println!(
            "Getting intersection info for moving rect: {:?}, end_pos: {:?}",
            rect, end_pos
        );

        let diff = end_pos.sub(&rect.pos);

        println!("diff: {:?}", diff);

        let line_segments = rect.get_all_points().map(|point| LineSegment {
            start_pos: point,
            end_pos: point.add(&diff),
        });

        for segment in &line_segments {
            println!("segment: {:?}", segment)
        }

        let intersection = line_segments
            .iter()
            .filter_map(|seg| self.get_line_segment_intersection_info(*seg))
            .min_by(|a, b| {
                a.distance
                    .partial_cmp(&b.distance)
                    .unwrap_or(Ordering::Equal)
            });
        intersection
    }

    pub fn move_rect3(&self, rect: &Rect3, end_pos: FineWorldPos) -> FineWorldPos {
        // Handle multiple sequential collisions (e.g., hitting a wall then the ground)
        let mut current_end_pos = end_pos;
        let mut current_rect = *rect;

        // loop 3 times to handle multiple collisions one for each axis
        for iteration in 0..3 {
            // Check for collisions from current position to target
            let intersections = self.get_rect3_intersection_infos(&current_rect, current_end_pos);

            if intersections.is_empty() {
                break;
            }

            // Calculate the intersection that would push the rect the least
            let mut axis_diffs = Vec::new();
            for intersection in &intersections {
                let hit_axis = intersection.world_plane.direction.to_axis();
                let outward = intersection.world_plane.direction.is_outward();
                let hit_plane_pos = intersection.world_plane.get_relative_y() as f32;

                let new_axis_pos = if outward {
                    hit_plane_pos + DISTANCE_EPSILON
                } else {
                    let rect_dim_dir = current_rect.dim.get_component_from_axis(hit_axis);
                    hit_plane_pos - (rect_dim_dir + DISTANCE_EPSILON)
                };

                let current_end_pos_intersection_axis_val =
                    current_end_pos.get_component_from_axis(hit_axis);

                let diff = new_axis_pos - current_end_pos_intersection_axis_val;

                axis_diffs.push((hit_axis, diff, new_axis_pos));
            }

            let min_diff = axis_diffs
                .iter()
                .min_by(|a, b| a.1.abs().partial_cmp(&b.1.abs()).unwrap_or(Ordering::Equal));

            if min_diff.is_none() {
                // No valid intersection found, break out of the loop
                break;
            }

            let (hit_axis, _, new_axis_pos) = min_diff.unwrap();

            // Push the rect!
            current_end_pos.set_component_from_axis(*hit_axis, *new_axis_pos);
            current_rect
                .pos
                .set_component_from_axis(*hit_axis, *new_axis_pos);

            let intersections_string = intersections
                .iter()
                .map(|info| format!("\n   {:?}", info))
                .collect::<Vec<String>>()
                .join(", ");

            let axises_diff_string = axis_diffs
                .iter()
                .map(|(axis, diff, new_axis_pos)| {
                    format!(
                        "\n   axis: {:?}, diff: {:?}, new_axis_pos: {:?}",
                        axis, diff, new_axis_pos
                    )
                })
                .collect::<Vec<String>>()
                .join(", ");

            js_log(&format!(
                "({:?}) hit_axis: {:?}, \naxises_diff: {}, \nintersections: {}, \nstart_pos: {:?}, \ntrying_to_go_to: {:?}, \ncurrent_rect_pos: {:?}, \ncurrent_end_pos: {:?}",
                iteration,
                hit_axis,
                axises_diff_string,
                intersections_string,
                rect.pos,
                end_pos,
                current_rect.pos,
                current_end_pos
            ));
        }

        current_end_pos
    }

    pub fn get_rect3_intersecting_blocks(&self, rect: &Rect3) -> Vec<WorldPos> {
        let res = rect
            .get_all_line_segments()
            .iter()
            .filter_map(|seg| self.get_line_segment_intersection_info(*seg))
            .map(|info| info.world_plane.world_pos)
            // remove duplicates
            .fold(Vec::new(), |mut acc, pos| {
                if !acc.contains(&pos) {
                    acc.push(pos);
                }
                acc
            });

        res
    }
}

#[wasm_bindgen]
impl World {
    pub fn move_rect3_wasm(&mut self, rect: JsValue, end_pos: JsValue) -> JsValue {
        from_value(rect)
            .and_then(|rect: Rect3| {
                from_value(end_pos).and_then(|end_pos: FineWorldPos| {
                    let new_pos = self.move_rect3(&rect, end_pos);
                    to_value(&new_pos)
                })
            })
            .unwrap_or(JsValue::NULL)
    }

    pub fn get_rect3_intersecting_blocks_wasm(&self, rect: JsValue) -> JsValue {
        from_value(rect)
            .and_then(|rect: Rect3| {
                let blocks = self.get_rect3_intersecting_blocks(&rect);
                to_value(&blocks)
            })
            .unwrap_or(JsValue::NULL)
    }
}

#[cfg(test)]
pub mod tests {
    use crate::{
        block::{BlockData, BlockType},
        chunk::Chunk,
        components::{fine_world_pos::FineWorldPos, size3::Size3, world_pos::WorldPos},
        geometry::rect3::Rect3,
        vec::Vector3Ops,
        world::{world_block::WorldBlock, World},
    };

    use super::DISTANCE_EPSILON;

    fn test_try_moving_block(
        block: WorldBlock,
        rect: Rect3,
        end_pos: FineWorldPos,
        expected_end_pos: FineWorldPos,
    ) -> () {
        let mut world = World::default();
        let chunk = Chunk::new(rect.pos.to_world_pos().to_chunk_pos());
        world.insert_chunk(chunk);
        let chunk = Chunk::new(expected_end_pos.to_world_pos().to_chunk_pos());
        world.insert_chunk(chunk);
        let chunk = Chunk::new(block.world_pos.to_chunk_pos());
        world.insert_chunk(chunk);

        world.add_block(&block).unwrap();

        let actual_pos = world.move_rect3(&rect, end_pos);
        let equal = actual_pos.equal(&expected_end_pos);
        println!("actual_pos: {:?}", actual_pos);
        println!("expected_end_pos: {:?}", expected_end_pos);
        assert!(equal);
    }

    fn test_try_moving_blocks(
        block: Vec<WorldBlock>,
        rect: Rect3,
        end_pos: FineWorldPos,
        expected_end_pos: FineWorldPos,
    ) -> () {
        let mut world = World::default();
        let chunk = Chunk::new(rect.pos.to_world_pos().to_chunk_pos());
        world.insert_chunk(chunk);
        let chunk = Chunk::new(expected_end_pos.to_world_pos().to_chunk_pos());
        world.insert_chunk(chunk);

        let chunk = Chunk::new(block[0].world_pos.to_chunk_pos());
        world.insert_chunk(chunk);

        for b in block {
            world.add_block(&b).unwrap();
        }

        let actual_pos = world.move_rect3(&rect, end_pos);
        let equal = actual_pos.equal(&expected_end_pos);
        println!("actual_pos: {:?}", actual_pos);
        println!("expected_end_pos: {:?}", expected_end_pos);
        assert!(equal);
    }

    #[test]
    fn test_not_moving() {
        test_try_moving_block(
            WorldBlock {
                block_type: BlockType::Leaf,
                extra_data: BlockData::None,
                world_pos: WorldPos::new(0, 0, 0),
            },
            Rect3 {
                pos: FineWorldPos {
                    x: 0.5,
                    y: 2.3,
                    z: 0.5,
                },
                dim: Size3::new(1.0, 1.0, 1.0),
            },
            FineWorldPos {
                x: 0.5,
                y: 2.1,
                z: 0.5,
            },
            FineWorldPos {
                x: 0.5,
                y: 2.1,
                z: 0.5,
            },
        );
    }

    #[test]
    fn try_move_down_into_block() {
        test_try_moving_block(
            WorldBlock {
                block_type: BlockType::Leaf,
                extra_data: BlockData::None,
                world_pos: WorldPos::new(0, 0, 0),
            },
            Rect3 {
                pos: FineWorldPos {
                    x: 0.5,
                    y: 2.3,
                    z: 0.5,
                },
                dim: Size3::new(1.0, 1.0, 1.0),
            },
            FineWorldPos {
                x: 0.5,
                y: 0.5,
                z: 0.5,
            },
            FineWorldPos {
                x: 0.5,
                y: 1.0 + DISTANCE_EPSILON,
                z: 0.5,
            },
        );
    }

    #[test]
    fn try_move_into_block_neg_z() {
        test_try_moving_block(
            WorldBlock {
                block_type: BlockType::Leaf,
                extra_data: BlockData::None,
                world_pos: WorldPos::new(1, 1, 1),
            },
            Rect3 {
                pos: FineWorldPos {
                    x: 0.5,
                    y: 1.3,
                    z: 2.5,
                },
                dim: Size3::new(1.0, 1.0, 1.0),
            },
            FineWorldPos {
                x: 0.5,
                y: 1.3,
                z: 1.9,
            },
            FineWorldPos {
                x: 0.5,
                y: 1.3,
                z: 2.0 + DISTANCE_EPSILON,
            },
        );
        test_try_moving_block(
            WorldBlock {
                block_type: BlockType::Leaf,
                extra_data: BlockData::None,
                world_pos: WorldPos::new(-3, 1, -3),
            },
            Rect3 {
                pos: FineWorldPos {
                    x: -3.5,
                    y: 1.3,
                    z: -1.5,
                },
                dim: Size3::new(1.0, 1.0, 1.0),
            },
            FineWorldPos {
                x: -3.5,
                y: 1.3,
                z: -2.5,
            },
            FineWorldPos {
                x: -3.5,
                y: 1.3,
                z: -2.0 + DISTANCE_EPSILON,
            },
        );
    }

    #[test]
    fn try_move_into_block_pos_z() {
        test_try_moving_block(
            WorldBlock {
                block_type: BlockType::Leaf,
                extra_data: BlockData::None,
                world_pos: WorldPos::new(0, 1, 0),
            },
            Rect3 {
                pos: FineWorldPos {
                    x: 0.5,
                    y: 1.5,
                    z: -1.5,
                },
                dim: Size3::new(0.8, 0.8, 0.8),
            },
            FineWorldPos {
                x: 0.5,
                y: 1.5,
                z: -0.5,
            },
            FineWorldPos {
                x: 0.5,
                y: 1.5,
                z: -0.8 - DISTANCE_EPSILON,
            },
        );
    }

    #[test]
    fn try_move_into_east_block() {
        test_try_moving_block(
            WorldBlock {
                block_type: BlockType::Leaf,
                extra_data: BlockData::None,
                world_pos: WorldPos::new(1, 1, 0),
            },
            Rect3 {
                pos: FineWorldPos {
                    x: -0.5,
                    y: 1.5,
                    z: 0.5,
                },
                dim: Size3::new(1.0, 1.0, 1.0),
            },
            FineWorldPos {
                x: 0.5,
                y: 1.5,
                z: -0.1,
            },
            FineWorldPos {
                x: 0.0 - DISTANCE_EPSILON,
                y: 1.5,
                z: -0.1,
            },
        );
        test_try_moving_block(
            WorldBlock {
                block_type: BlockType::Leaf,
                extra_data: BlockData::None,
                world_pos: WorldPos::new(5, 1, 0),
            },
            Rect3 {
                pos: FineWorldPos {
                    x: 3.65,
                    y: 1.03,
                    z: 0.023,
                },
                dim: Size3::new(1.0, 1.0, 1.0),
            },
            FineWorldPos {
                x: 5.007,
                y: 1.03,
                z: 0.019,
            },
            FineWorldPos {
                x: 4.0 - DISTANCE_EPSILON,
                y: 1.03,
                z: 0.019,
            },
        );
    }

    #[test]
    fn try_move_into_block_neg_x() {
        // test_try_moving_block(
        //     WorldBlock {
        //         block_type: BlockType::Leaf,
        //         extra_data: BlockData::None,
        //         world_pos: WorldPos::new(-10, 1, -7),
        //     },
        //     Rect3 {
        //         pos: FineWorldPos {
        //             x: -11.1,
        //             y: 1.5,
        //             z: -6.5,
        //         },
        //         dim: Vec3::new(1.0, 1.0, 1.0),
        //     },
        //     FineWorldPos {
        //         x: -10.9,
        //         y: 1.5,
        //         z: -6.5,
        //     },
        //     FineWorldPos {
        //         x: -11.0 - DISTANCE_EPSILON,
        //         y: 1.5,
        //         z: 0.5,
        //     },
        // );

        // test_try_moving_block(
        //     WorldBlock {
        //         block_type: BlockType::Gold,
        //         extra_data: BlockData::None,
        //         world_pos: WorldPos::new(-8, 1, 3),
        //     },
        //     Rect3 {
        //         pos: FineWorldPos {
        //             x: -6.6,
        //             y: 1.5,
        //             z: 3.5,
        //         },
        //         dim: Vec3::new(1.0, 1.0, 1.0),
        //     },
        //     FineWorldPos {
        //         x: -7.1,
        //         y: 1.5,
        //         z: 3.5,
        //     },
        //     FineWorldPos {
        //         x: -7.0 + DISTANCE_EPSILON,
        //         y: 1.5,
        //         z: 3.5,
        //     },
        // );
    }

    #[test]
    fn moving_ontop_of_blocks() {
        test_try_moving_block(
            WorldBlock {
                block_type: BlockType::Leaf,
                extra_data: BlockData::None,
                world_pos: WorldPos::new(0, 0, 0),
            },
            Rect3 {
                pos: FineWorldPos {
                    x: 0.5,
                    y: 1.1,
                    z: 0.5,
                },
                dim: Size3::new(1.0, 2.0, 1.0),
            },
            FineWorldPos {
                x: -0.3,
                y: 1.1,
                z: -0.3,
            },
            FineWorldPos {
                x: -0.3,
                y: 1.1,
                z: -0.3,
            },
        );
    }

    #[test]
    fn try_move_caddy_corner_move_neg() {
        test_try_moving_blocks(
            vec![
                WorldBlock {
                    block_type: BlockType::Leaf,
                    extra_data: BlockData::None,
                    world_pos: WorldPos::new(-3, 1, -2),
                },
                WorldBlock {
                    block_type: BlockType::Leaf,
                    extra_data: BlockData::None,
                    world_pos: WorldPos::new(-2, 1, -3),
                },
            ],
            Rect3 {
                pos: FineWorldPos {
                    x: -1.5,
                    y: 1.3,
                    z: -1.5,
                },
                dim: Size3::new(0.8, 2.0, 0.8),
            },
            FineWorldPos {
                x: -2.5,
                y: 1.3,
                z: -2.5,
            },
            FineWorldPos {
                x: -2.0 + DISTANCE_EPSILON,
                y: 1.3,
                z: -2.0 + DISTANCE_EPSILON,
            },
        )
    }

    #[test]
    fn try_move_caddy_corner_move_pos_x_tiny_pos_z() {
        test_try_moving_blocks(
            vec![
                WorldBlock {
                    block_type: BlockType::Leaf,
                    extra_data: BlockData::None,
                    world_pos: WorldPos::new(3, 1, 2),
                },
                WorldBlock {
                    block_type: BlockType::Leaf,
                    extra_data: BlockData::None,
                    world_pos: WorldPos::new(2, 1, 3),
                },
            ],
            Rect3 {
                pos: FineWorldPos {
                    x: 1.9,
                    y: 1.3,
                    z: 1.9,
                },
                dim: Size3::new(0.8, 2.0, 0.8),
            },
            FineWorldPos {
                x: 2.3,
                y: 1.3,
                z: 2.3,
            },
            FineWorldPos {
                x: 2.2 - DISTANCE_EPSILON,
                y: 1.3,
                z: 2.2 - DISTANCE_EPSILON,
            },
        )
    }

    #[test]
    fn jumping_off_block() {
        test_try_moving_block(
            WorldBlock {
                block_type: BlockType::Leaf,
                extra_data: BlockData::None,
                world_pos: WorldPos::new(0, 0, 0),
            },
            Rect3 {
                pos: FineWorldPos {
                    x: 0.5,
                    y: 1.1,
                    z: 0.5,
                },
                dim: Size3::new(1.0, 1.0, 1.0),
            },
            FineWorldPos {
                x: 0.3,
                y: 2.0,
                z: -0.3,
            },
            FineWorldPos {
                x: 0.3,
                y: 2.0,
                z: -0.3,
            },
        );
    }

    #[test]
    fn test_cursed_movement() {
        // test_try_moving_blocks(
        //     vec![
        //         WorldBlock {
        //             block_type: BlockType::Leaf,
        //             extra_data: BlockData::None,
        //             world_pos: WorldPos::new(-15, 0, -24),
        //         },
        //         WorldBlock {
        //             block_type: BlockType::Leaf,
        //             extra_data: BlockData::None,
        //             world_pos: WorldPos::new(-15, 0, -25),
        //         },
        //         WorldBlock {
        //             block_type: BlockType::Leaf,
        //             extra_data: BlockData::None,
        //             world_pos: WorldPos::new(-14, 0, -24),
        //         },
        //         WorldBlock {
        //             block_type: BlockType::Leaf,
        //             extra_data: BlockData::None,
        //             world_pos: WorldPos::new(-14, 0, -25),
        //         },
        //     ],
        //     Rect3 {
        //         pos: FineWorldPos {
        //             x: -14.833749,
        //             y: 1.03,
        //             z: -25.27446,
        //         },
        //         dim: Size3::new(1.0, 1.0, 1.0),
        //     },
        //     FineWorldPos {
        //         x: -15.493927,
        //         y: 0.92999995,
        //         z: -24.523352,
        //     },
        //     FineWorldPos {
        //         x: -15.493927,
        //         y: 1.03,
        //         z: -24.523352,
        //     },
        // );
    }

    fn test_get_rect3_intersecting_blocks(
        block: WorldBlock,
        rect: Rect3,
        expected_blocks: Vec<WorldPos>,
    ) -> () {
        let mut world = World::default();
        let chunk = Chunk::new(rect.pos.to_world_pos().to_chunk_pos());
        world.insert_chunk(chunk);
        world.add_block(&block).unwrap();
        let actual_blocks = world.get_rect3_intersecting_blocks(&rect);
        assert_eq!(actual_blocks, expected_blocks);
    }

    #[test]
    fn get_rect3_intersecting_blocks_no_intersection() {
        test_get_rect3_intersecting_blocks(
            WorldBlock {
                block_type: BlockType::Leaf,
                extra_data: BlockData::None,
                world_pos: WorldPos::new(0, 0, 0),
            },
            Rect3 {
                pos: FineWorldPos {
                    x: 0.5,
                    y: 2.3,
                    z: 0.5,
                },
                dim: Size3::new(1.0, 1.0, 1.0),
            },
            vec![],
        );
    }

    #[test]
    fn get_rect3_intersecting_blocks_intersection() {
        test_get_rect3_intersecting_blocks(
            WorldBlock {
                block_type: BlockType::Leaf,
                extra_data: BlockData::None,
                world_pos: WorldPos::new(0, 0, 0),
            },
            Rect3 {
                pos: FineWorldPos {
                    x: 0.0,
                    y: 0.5,
                    z: 0.0,
                },
                dim: Size3::new(1.0, 1.0, 1.0),
            },
            vec![WorldPos::new(0, 0, 0)],
        );
    }
}
