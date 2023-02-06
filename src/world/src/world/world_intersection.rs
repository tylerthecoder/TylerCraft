use super::{world_block::WorldBlock, World};
use crate::{direction::Direction, geometry::ray::Ray, plane::WorldPlane};
use serde::{Deserialize, Serialize};

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

impl World {
    pub fn get_pointed_at_block(&self, ray: Ray) -> Option<LookingAt> {
        // n is how much the ray will march forward
        for n in 0..10 {
            let pointed_at = ray
                .move_forward(n as f32)
                .pos
                .to_world_pos()
                .get_cross_vecs()
                .iter()
                .filter_map(|pos| self.get_mesh_at_pos(pos.to_owned()).ok())
                .flat_map(|block_mesh| {
                    println!("directions: {:?}", block_mesh);
                    match ray.distance_from_block_mesh(&block_mesh) {
                        Some((plane, distance)) => Some(LookingAt {
                            block: self.get_block(&block_mesh.world_pos),
                            face: plane.direction,
                            distance,
                        }),
                        None => None,
                    }
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

#[cfg(test)]
mod tests {
    use crate::{
        block::{BlockData, BlockType},
        chunk::Chunk,
        direction::Direction,
        geometry::ray::Ray,
        positions::{FineWorldPos, WorldPos},
        world::{world_block::WorldBlock, World},
    };

    use super::LookingAt;

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
                pos: FineWorldPos::new(0.5, 0.5, 0.5),
                rot: Direction::Down.to_rotation(),
            },
            LookingAt {
                block: block,
                face: Direction::Up,
                distance: 0.5,
            },
        );
    }
}
