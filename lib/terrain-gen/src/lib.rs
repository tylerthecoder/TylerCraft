mod utils;
use noise::{NoiseFn, Perlin};
use rand::rngs::StdRng;
use rand::thread_rng;
use rand::SeedableRng;
use rand_distr::{Distribution, Normal, NormalError, Uniform};
use wasm_bindgen::prelude::*;
use world::{
    block::{self, BlockType, ChunkBlock},
    chunk::{Chunk, CHUNK_WIDTH},
    positions::{ChunkPos, InnerChunkPos, WorldPos},
    world::world_block::WorldBlock,
};

// remove all the positions that are too close to each other in the chunk
fn remove_close_positions<'a, I, J>(pos_iter: I, checking_pos_iter: J) -> Vec<WorldPos>
where
    I: IntoIterator<Item = &'a WorldPos>,
    J: IntoIterator<Item = &'a WorldPos> + Clone,
{
    let mut out_positions = Vec::new();

    for pos in pos_iter {
        let mut too_close = false;
        for other_pos in checking_pos_iter.clone() {
            if pos.distance_to_2::<i32, f64>(&other_pos) < 3.0 {
                too_close = true;
                break;
            }
        }
        if !too_close {
            out_positions.push(pos.to_owned());
        }
    }

    out_positions
}

struct Tree {
    blocks: Vec<WorldBlock>,
}

impl Tree {
    fn make_simple(center_pos: &WorldPos) -> Self {
        let mut blocks = Vec::new();

        blocks.push(WorldBlock {
            world_pos: center_pos.to_owned(),
            block_type: BlockType::Wood,
            extra_data: block::BlockData::None,
        });

        blocks.push(WorldBlock {
            world_pos: WorldPos {
                x: center_pos.x,
                y: center_pos.y + 1,
                z: center_pos.z,
            },
            block_type: BlockType::Wood,
            extra_data: block::BlockData::None,
        });

        blocks.push(WorldBlock {
            world_pos: WorldPos {
                x: center_pos.x,
                y: center_pos.y + 2,
                z: center_pos.z,
            },
            block_type: BlockType::Wood,
            extra_data: block::BlockData::None,
        });

        Self { blocks }
    }
}

pub struct TreeRandomSpreadGenerator {
    seed: u64,
}

impl TreeRandomSpreadGenerator {
    fn get_potential_tree_locations(
        &self,
        chunk_pos: ChunkPos,
    ) -> Box<dyn Iterator<Item = WorldPos>> {
        let chunk_seed = self.seed + (chunk_pos.x as u64 * 1000) + (chunk_pos.y as u64 * 1000000);
        let mut rng: StdRng = SeedableRng::seed_from_u64(chunk_seed);
        let dist = Uniform::new(0, CHUNK_WIDTH);

        let mut tree_locations: Vec<WorldPos> = Vec::new();

        for _ in 0..20 {
            let x = dist.sample(&mut rng);
            let z = dist.sample(&mut rng);

            let pos = WorldPos {
                x: (chunk_pos.x * CHUNK_WIDTH) as i32 + x as i32,
                y: 0,
                z: (chunk_pos.y * CHUNK_WIDTH) as i32 + z as i32,
            };

            // loop over and make sure that the tree is not too close to any other trees
            let mut too_close = false;
            for other_pos in tree_locations.iter() {
                if pos.distance_to_2::<i32, f64>(&other_pos) < 3.0 {
                    too_close = true;
                    break;
                }
            }

            if too_close {
                continue;
            }

            tree_locations.push(pos);
        }

        Box::new(tree_locations.into_iter())
    }

    fn get_tree_locations(self: &Self, chunk_pos: ChunkPos) -> Vec<WorldPos> {
        let corner_potential_tree_locations = self
            .get_potential_tree_locations(ChunkPos {
                x: chunk_pos.x + 1,
                y: chunk_pos.y + 1,
            })
            .collect::<Vec<WorldPos>>();

        let above_potential_tree_locations = self.get_potential_tree_locations(ChunkPos {
            x: chunk_pos.x,
            y: chunk_pos.y + 1,
        });
        let right_potential_tree_locations = self.get_potential_tree_locations(ChunkPos {
            x: chunk_pos.x + 1,
            y: chunk_pos.y,
        });

        let nearby_potential_tree_locations = above_potential_tree_locations
            .chain(right_potential_tree_locations)
            .collect::<Vec<WorldPos>>();

        let nearby_valid_tree_locations = remove_close_positions(
            nearby_potential_tree_locations.iter(),
            corner_potential_tree_locations.iter(),
        );

        let potential_tree_locations = self
            .get_potential_tree_locations(chunk_pos)
            .collect::<Vec<WorldPos>>();

        let t = remove_close_positions(
            potential_tree_locations.iter(),
            nearby_valid_tree_locations.iter(),
        );

        t
    }

    fn get_trees(self: &Self, chunk_pos: ChunkPos) -> Vec<Tree> {
        let tree_locations = self.get_tree_locations(chunk_pos);

        let mut trees = Vec::new();

        for tree_location in tree_locations {
            trees.push(Tree::make_simple(&tree_location));
        }

        trees
    }
}

#[wasm_bindgen]
pub fn get_chunk_wasm(chunk_x: i16, chunk_y: i16) -> Chunk {
    let seed = 100;
    let jag_factor = 1.0 / 100.0;
    let height_multiplier = 10.0;

    let noise = Perlin::new(seed);

    let mut chunk = Chunk::new(ChunkPos {
        x: chunk_x,
        y: chunk_y,
    });

    fn main() -> Result<(), NormalError> {
        let mut rng = thread_rng();
        let normal = Normal::new(2.0, 3.0)?;
        let v = normal.sample(&mut rng);
        use web_sys::console;
        console::log_1(&format!("Dist: {}", v).into());
        Ok(())
    }

    main().unwrap();

    let trees_in_chunk = TreeRandomSpreadGenerator { seed: 100 };

    for x in 0u8..CHUNK_WIDTH as u8 {
        for z in 0u8..CHUNK_WIDTH as u8 {
            let world_x = (chunk_x * CHUNK_WIDTH as i16) as f64 + (x as f64);
            let world_z = (chunk_y * CHUNK_WIDTH as i16) as f64 + (z as f64);

            let per_val = noise.get([world_x * jag_factor, world_z * jag_factor]);
            let height = ((per_val.abs() * height_multiplier) + 5.0) as u8;

            // use web_sys::console;
            // console::log_1(&format!("height: {}", height).into());

            for y in 0u8..height {
                let block = ChunkBlock {
                    pos: InnerChunkPos::new(x, y, z),
                    block_type: BlockType::Stone,
                    extra_data: block::BlockData::None,
                };

                chunk.add_block(block);
            }
            // add top grass block
            let block = ChunkBlock {
                pos: InnerChunkPos::new(x, height, z),
                block_type: BlockType::Grass,
                extra_data: block::BlockData::None,
            };
            chunk.add_block(block);

            // add all the trees in the chunk

            let trees = trees_in_chunk.get_trees(ChunkPos {
                x: chunk_x,
                y: chunk_y,
            });

            for tree in trees {
                for block in tree.blocks {
                    chunk.add_block(ChunkBlock {
                        pos: block
                            .world_pos
                            .to_inner_chunk_pos()
                            .add_vec(InnerChunkPos::new(0, height as u8, 0)),
                        block_type: block.block_type,
                        extra_data: block.extra_data,
                    });
                }
            }
        }
    }

    chunk
}
