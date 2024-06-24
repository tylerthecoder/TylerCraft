use std::cmp::Ordering;

use crate::{positions::FineWorldPos, vec::Vec3, world::World};

use super::line_segment::LineSegment;

pub struct Rect3 {
    pub pos: FineWorldPos,
    pub dim: Vec3<f32>,
}

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
}

impl World {
    pub fn move_rect3(&mut self, rect: &Rect3, vec: Vec3<f32>) -> Rect3 {
        let line_segments = rect.get_all_points().map(|point| LineSegment {
            start_pos: point,
            end_pos: point + vec,
        });

        let intersection = line_segments
            .iter()
            .filter_map(|seg| self.get_intersecting_blocks(*seg))
            .min_by(|a, b| {
                a.distance
                    .partial_cmp(&b.distance)
                    .unwrap_or(Ordering::Equal)
            });

        let vel = match intersection {
            Some(info) => info.intersection_point - rect.pos,
            None => vec,
        };

        Rect3 {
            pos: rect.pos + vel,
            dim: rect.dim,
        }
    }
}
