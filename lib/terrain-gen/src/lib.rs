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
    base_block_pos: WorldPos,
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

        Self {
            blocks,
            base_block_pos: center_pos.to_owned(),
        }
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

<<<<<<< Updated upstream
#[wasm_bindgen]
pub fn get_chunk_wasm(chunk_x: i16, chunk_y: i16) -> Chunk {
    let seed = 100;
    let jag_factor = 1.0 / 100.0;
    let height_multiplier = 10.0;
=======
struct FlowerGetter {
    seed: u64,
}

#[derive(Eq, PartialEq)]
struct FlowerLocator {
    world_x: i32,
    world_z: i32,
}

impl FlowerLocator {
    fn make_chunk_block(self: &Self, y_pos: i32) -> ChunkBlock {
        ChunkBlock {
            pos: WorldPos::new(
                self.world_x % CHUNK_WIDTH as i32,
                y_pos,
                self.world_z % CHUNK_WIDTH as i32,
            )
            .to_inner_chunk_pos(),
            block_type: BlockType::RedFlower,
            extra_data: block::BlockData::None,
        }
    }
}

impl FlowerGetter {
    fn get_flowers(self: &Self, chunk_pos: &ChunkPos) -> Vec<FlowerLocator> {
        // generate 15-25 random flowers per chunk
        let chunk_seed = self.seed + (chunk_pos.x as u64 * 1000) + (chunk_pos.y as u64 * 1000000);
        let mut rng: StdRng = SeedableRng::seed_from_u64(chunk_seed);
        let dist = Uniform::new(0, CHUNK_WIDTH);
        let flower_count_getter = Uniform::new(15, 25);

        let flower_count = flower_count_getter.sample(&mut rng);

        let mut flowers = Vec::new();

        for _ in 0..flower_count {
            let x = dist.sample(&mut rng);
            let z = dist.sample(&mut rng);

            let loc = FlowerLocator {
                world_x: (chunk_pos.x * CHUNK_WIDTH) as i32 + x as i32,
                world_z: (chunk_pos.y * CHUNK_WIDTH) as i32 + z as i32,
            };

            let already_has_flower = flowers.iter().any(|other_loc| *other_loc == loc);

            if already_has_flower {
                continue;
            }

            flowers.push(loc);
        }

        flowers
    }
}

trait ChunkGenerator {
    fn get_chunk(&self, chunk_pos: ChunkPos) -> Chunk;
}
>>>>>>> Stashed changes

struct FlatChunkGenerator {}

<<<<<<< Updated upstream
    let mut chunk = Chunk::new(ChunkPos {
        x: chunk_x,
        y: chunk_y,
    });

    let trees_in_chunk = TreeRandomSpreadGenerator { seed: 100 };

    let trees = trees_in_chunk.get_trees(ChunkPos {
        x: chunk_x,
        y: chunk_y,
    });

    for tree in trees {
        for block in tree.blocks {
            let per_val = noise.get([
                (tree.base_block_pos.x as f64) * jag_factor,
                (tree.base_block_pos.z as f64) * jag_factor,
            ]);
            let height = ((per_val.abs() * height_multiplier) + 5.0) as i32;
            let height_offset = height - tree.base_block_pos.y;
            chunk.add_block(ChunkBlock {
                pos: block
                    .world_pos
                    .to_inner_chunk_pos()
                    .add_vec(InnerChunkPos::new(0, height_offset as u8, 0)),
                block_type: block.block_type,
                extra_data: block.extra_data,
            });
        }
    }

    for x in 0u8..CHUNK_WIDTH as u8 {
        for z in 0u8..CHUNK_WIDTH as u8 {
            let world_x = (chunk_x * CHUNK_WIDTH as i16) as f64 + (x as f64);
            let world_z = (chunk_y * CHUNK_WIDTH as i16) as f64 + (z as f64);

            let per_val = noise.get([world_x * jag_factor, world_z * jag_factor]);
            let height = ((per_val.abs() * height_multiplier) + 5.0) as u8;

            // use web_sys::console;
            // console::log_1(&format!("height: {}", height).into());

            for y in 0u8..height {
=======
impl ChunkGenerator for FlatChunkGenerator {
    fn get_chunk(&self, chunk_pos: ChunkPos) -> Chunk {
        let mut chunk = Chunk::new(chunk_pos);

        for x in 0u8..CHUNK_WIDTH as u8 {
            for z in 0u8..CHUNK_WIDTH as u8 {
>>>>>>> Stashed changes
                let block = ChunkBlock {
                    pos: InnerChunkPos::new(x, 0, z),
                    block_type: BlockType::Grass,
                    extra_data: block::BlockData::None,
                };

                chunk.add_block(block);
            }
        }

        chunk
    }
}

struct ForestChunkGenerator {}

impl ChunkGenerator for ForestChunkGenerator {
    fn get_chunk(&self, chunk_pos: ChunkPos) -> Chunk {
        let chunk_x = chunk_pos.x;
        let chunk_y = chunk_pos.y;

        let seed = 100;
        let jag_factor = 1.0 / 100.0;
        let height_multiplier = 10.0;

        let noise = Perlin::new(seed);

        let chunk_pos = ChunkPos {
            x: chunk_x,
            y: chunk_y,
        };

        let get_height = |x: f64, z: f64| -> f64 {
            let per_val = noise.get([x * jag_factor, z * jag_factor]);
            let height = ((per_val.abs() * height_multiplier) + 5.0) as i32;
            height as f64
        };

        let mut chunk = Chunk::new(ChunkPos {
            x: chunk_x,
            y: chunk_y,
        });

        let trees_in_chunk = TreeRandomSpreadGenerator { seed: 100 };

        let trees = trees_in_chunk.get_trees(ChunkPos {
            x: chunk_x,
            y: chunk_y,
        });

        for tree in trees {
            let height = get_height(tree.world_x as f64, tree.world_z as f64) as i32;
            let blocks = tree.get_world_blocks(height);
            for block in blocks {
                let block_chunnk_pos = block.world_pos.to_chunk_pos();
                if block_chunnk_pos != chunk_pos {
                    continue;
                }
                chunk.add_block(block.to_chunk_block());
            }
        }

        // place flowers
        let flowers_in_chunk = FlowerGetter { seed: 100 };

        let flowers = flowers_in_chunk.get_flowers(&chunk_pos);

        for flower in flowers {
            let height = get_height(flower.world_x as f64, flower.world_z as f64) as i32;

            let flower = flower.make_chunk_block(height + 1);

            // only place block if there isn't already a block there
            if chunk.has_block(&flower.pos) {
                continue;
            }

            chunk.add_block(flower);
        }

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
            }
        }

        chunk
    }
}

#[wasm_bindgen]
pub struct TerrainConfig {
    seed: u64,
    jag_factor: f64,
    height_multiplier: f64,
    flat: bool,
}

#[wasm_bindgen]
pub struct TerrainGenerator {
    config: TerrainConfig,
}

impl Default for TerrainConfig {
    fn default() -> Self {
        TerrainConfig {
            seed: 100,
            jag_factor: 1.0 / 100.0,
            height_multiplier: 10.0,
            flat: false,
        }
    }
}

#[wasm_bindgen]
impl TerrainGenerator {
    pub fn get_chunk(&self, chunk_x: i16, chunk_y: i16) -> Chunk {
        if self.config.flat {
            FlatChunkGenerator {}.get_chunk(ChunkPos {
                x: chunk_x,
                y: chunk_y,
            })
        } else {
            ForestChunkGenerator {}.get_chunk(ChunkPos {
                x: chunk_x,
                y: chunk_y,
            })
        }
    }
}
