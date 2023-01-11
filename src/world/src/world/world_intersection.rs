use serde::{Deserialize, Serialize};

use super::World;
use crate::{block::WorldBlock, direction::Direction, geometry::ray::Ray, plane::WorldPlane};

#[derive(Serialize, Deserialize)]
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

impl World {
    pub fn get_pointed_at_block(&self, ray: Ray) -> Option<LookingAt> {
        // n is how much the ray will march forward
        for n in 0..10 {
            let pointed_at = ray
                .move_forward(n as f32)
                .pos
                .to_world_pos()
                .get_adjacent_vecs()
                .iter()
                .filter_map(|pos| self.get_mesh_at_pos(pos.to_owned()).ok())
                .flat_map(|directions| {
                    directions.into_iter().filter_map(|direction| {
                        let plane = WorldPlane::new(ray.pos.to_world_pos(), direction);

                        match ray.distance_from_plane(&plane) {
                            Some(distance) => Some(LookingAt {
                                block: self.get_block(&plane.world_pos),
                                face: plane.direction,
                                distance,
                            }),
                            None => None,
                        }
                    })
                })
                .min_by(
                    |LookingAt {
                         distance: distance_a,
                         ..
                     },
                     LookingAt {
                         distance: distance_b,
                         ..
                     }| {
                        distance_a
                            .partial_cmp(distance_b)
                            .unwrap_or(std::cmp::Ordering::Equal)
                    },
                );

            if pointed_at.is_some() {
                return pointed_at;
            }
        }
        None
    }
}

// Tests

#[cfg(test)]
mod test {
    use crate::{
        positions::{ChunkPos, InnerChunkPos},
        world::World,
    };

    #[test]
    fn adds_chunks() {
        let mut world = World::default();

        let chunk_pos = ChunkPos::new(0, 0);
        let inner_chunk_pos = InnerChunkPos::new(0, 0, 1);
    }
}
