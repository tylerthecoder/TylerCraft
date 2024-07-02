use super::line_segment::{LineSegment, LineSegmentIntersectionInfo};
use crate::positions::WorldPos;
use crate::{positions::FineWorldPos, vec::Vec3, world::World};
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::{from_value, to_value};
use std::cmp::Ordering;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, Copy)]
pub struct Rect3 {
    pub pos: FineWorldPos,
    pub dim: Vec3<f32>,
}

static DISTANCE_EPSILON: f32 = 0.03;

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
    fn get_moving_rect3_intersection_info(
        &self,
        rect: &Rect3,
        end_pos: FineWorldPos,
    ) -> Option<LineSegmentIntersectionInfo> {
        let diff = end_pos - rect.pos;

        println!("diff: {:?}", diff);

        let line_segments = rect.get_all_points().map(|point| LineSegment {
            start_pos: point,
            end_pos: point + diff,
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
        let intersection = self.get_moving_rect3_intersection_info(rect, end_pos);

        let new_pos_from_info = |info: LineSegmentIntersectionInfo| {
            let hit_axis = info.world_plane.direction.to_axis();
            let mut new_pos = end_pos.clone();
            let outward = info.world_plane.direction.is_outward();
            let eplison_diff = if outward {
                DISTANCE_EPSILON
            } else {
                -DISTANCE_EPSILON
            };

            let hit_plane_pos = info.world_plane.get_relative_y() as f32;

            let new_axis_pos = eplison_diff + hit_plane_pos;
            new_pos.set_component_from_axis(hit_axis, new_axis_pos);
            new_pos
        };

        if let Some(info) = intersection {
            unsafe { web_sys::console::log_2(&"intersection".into(), &to_value(&info).unwrap()) }

            println!("intersection: {:?}", info);
            // okay so we hit something, but we might not hit something if we zero out the wall we
            // hit and try again
            let new_pos = new_pos_from_info(info);
            println!("new_pos: {:?}", new_pos);

            let new_rect = Rect3 {
                pos: new_pos,
                dim: rect.dim,
            };
            let new_intersection = self.get_moving_rect3_intersection_info(&new_rect, end_pos);

            if let Some(new_info) = new_intersection {
                println!("new intersection: {:?}", new_info);
                return new_pos_from_info(new_info);
            }

            return new_pos;
        };

        end_pos
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
        geometry::rect3::Rect3,
        positions::{FineWorldPos, WorldPos},
        vec::Vec3,
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
                dim: Vec3::new(1.0, 1.0, 1.0),
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
    fn try_move_into_south_block() {
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
                dim: Vec3::new(1.0, 1.0, 1.0),
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
    fn try_move_into_east_block() {
        test_try_moving_block(
            WorldBlock {
                block_type: BlockType::Leaf,
                extra_data: BlockData::None,
                world_pos: WorldPos::new(1, 1, 0),
            },
            Rect3 {
                pos: FineWorldPos {
                    x: 0.5,
                    y: 1.5,
                    z: 0.5,
                },
                dim: Vec3::new(1.0, 1.0, 1.0),
            },
            FineWorldPos {
                x: 1.2,
                y: 1.5,
                z: -0.1,
            },
            FineWorldPos {
                x: 1.0 - DISTANCE_EPSILON,
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
                    x: 4.65,
                    y: 1.03,
                    z: 0.023,
                },
                dim: Vec3::new(1.0, 1.0, 1.0),
            },
            FineWorldPos {
                x: 5.007,
                y: 1.03,
                z: 0.019,
            },
            FineWorldPos {
                x: 5.0 - DISTANCE_EPSILON,
                y: 1.03,
                z: 0.019,
            },
        );
    }

    #[test]
    fn try_move_into_west_block() {
        test_try_moving_block(
            WorldBlock {
                block_type: BlockType::Leaf,
                extra_data: BlockData::None,
                world_pos: WorldPos::new(-1, 1, 0),
            },
            Rect3 {
                pos: FineWorldPos {
                    x: 0.5,
                    y: 1.5,
                    z: 0.5,
                },
                dim: Vec3::new(1.0, 1.0, 1.0),
            },
            FineWorldPos {
                x: -0.9,
                y: 1.5,
                z: 0.5,
            },
            FineWorldPos {
                x: 0.0 + DISTANCE_EPSILON,
                y: 1.5,
                z: 0.5,
            },
        );
    }

    #[test]
    fn try_move_into_north_block() {
        test_try_moving_block(
            WorldBlock {
                block_type: BlockType::Leaf,
                extra_data: BlockData::None,
                world_pos: WorldPos::new(1, 1, 1),
            },
            Rect3 {
                pos: FineWorldPos {
                    x: 1.5,
                    y: 1.3,
                    z: 0.5,
                },
                dim: Vec3::new(1.0, 1.0, 1.0),
            },
            FineWorldPos {
                x: 1.5,
                y: 1.3,
                // move all the way through it
                z: 2.1,
            },
            FineWorldPos {
                x: 1.5,
                y: 1.3,
                z: 1.0 - DISTANCE_EPSILON,
            },
        );
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
                dim: Vec3::new(1.0, 2.0, 1.0),
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
                dim: Vec3::new(1.0, 1.0, 1.0),
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
                dim: Vec3::new(1.0, 1.0, 1.0),
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
                dim: Vec3::new(1.0, 1.0, 1.0),
            },
            vec![WorldPos::new(0, 0, 0)],
        );
    }
}
