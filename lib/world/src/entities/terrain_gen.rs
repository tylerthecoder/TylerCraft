use crate::{
    chunk::Chunk,
    positions::{ChunkPos, WorldPos},
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

struct TreeLocator {
    world_x: i32,
    world_z: i32,
}

impl TreeLocator {
    fn is_in_chunk(&self, chunk_pos: &ChunkPos) -> bool {
        let my_chunk_pos = WorldPos {
            x: self.world_x,
            y: 0,
            z: self.world_z,
        }
        .to_chunk_pos();

        if my_chunk_pos == *chunk_pos {
            return true;
        }

        // check leaf blocks
        for x in Directions::flat() {
            let other_pos = WorldPos {
                x: self.world_x,
                y: 0,
                z: self.world_z,
            }
            .move_direction(&x)
            .to_chunk_pos();
            if other_pos == *chunk_pos {
                return true;
            }
        }

        return false;
    }

    fn get_world_blocks(&self, y_pos: i32) -> Vec<WorldBlock> {
        let height = 5;

        // make trunk
        let mut blocks = (0..height)
            .map(|y| WorldBlock {
                world_pos: WorldPos {
                    x: self.world_x,
                    y: y + y_pos,
                    z: self.world_z,
                },
                block_type: BlockType::Wood,
                extra_data: block::BlockData::None,
            })
            .collect::<Vec<WorldBlock>>();

        // add leaves at top
        let mut leaf_dirs = Directions::all();
        leaf_dirs.remove_direction(Direction::Down);
        for x in leaf_dirs {
            let pos = WorldPos {
                x: self.world_x,
                y: height + y_pos,
                z: self.world_z,
            }
            .move_direction(&x);

            blocks.push(WorldBlock {
                world_pos: pos,
                block_type: BlockType::Leaf,

                extra_data: block::BlockData::None,
            });
        }

        blocks
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

    fn get_trees(self: &Self, chunk_pos: ChunkPos) -> Vec<TreeLocator> {
        let tree_locations = self.get_tree_locations(chunk_pos);

        let mut trees = Vec::new();

        for tree_location in tree_locations {
            trees.push(TreeLocator {
                world_x: tree_location.x,
                world_z: tree_location.z,
            });
        }

        // loop over nearby chunks to make sure there isn't an overlaping tree
        for x in EVERY_FLAT_DIRECTION {
            let other_chunk_pos = chunk_pos.move_in_flat_direction(&x);
            let other_tree_locations = self.get_tree_locations(other_chunk_pos);

            let other_trees = other_tree_locations
                .into_iter()
                .map(|tree_location| TreeLocator {
                    world_x: tree_location.x,
                    world_z: tree_location.z,
                })
                .filter(|tree_location| tree_location.is_in_chunk(&other_chunk_pos))
                .collect::<Vec<TreeLocator>>();

            trees.extend(other_trees);
        }

        trees
    }
}

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

struct BasicChunkGetter {
    seed: u32,
    jag_factor: f64,
    height_multiplier: f64,
}

impl BasicChunkGetter {
    pub fn make(seed: u32) -> BasicChunkGetter {
        BasicChunkGetter {
            seed,
            jag_factor: 1.0 / 100.0,
            height_multiplier: 10.0,
        }
    }

    pub fn get_chunk(&self, chunk_pos: &ChunkPos) -> Chunk {
        let noise = Perlin::new(self.seed);

        let get_height = |x: f64, z: f64| -> f64 {
            let per_val = noise.get([x * self.jag_factor, z * self.jag_factor]);
            let height = ((per_val.abs() * self.height_multiplier) + 5.0) as i32;
            height as f64
        };

        let mut chunk = Chunk::new(*chunk_pos);

        let trees_in_chunk = TreeRandomSpreadGenerator { seed: 100 };

        let trees = trees_in_chunk.get_trees(*chunk_pos);

        for tree in trees {
            let height = get_height(tree.world_x as f64, tree.world_z as f64) as i32;
            let blocks = tree.get_world_blocks(height);
            for block in blocks {
                let block_chunnk_pos = block.world_pos.to_chunk_pos();
                if block_chunnk_pos != *chunk_pos {
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
                let world_x = (chunk_pos.x * CHUNK_WIDTH as i16) as f64 + (x as f64);
                let world_z = (chunk_pos.y * CHUNK_WIDTH as i16) as f64 + (z as f64);

                let per_val = noise.get([world_x * self.jag_factor, world_z * self.jag_factor]);
                let height = ((per_val.abs() * self.height_multiplier) + 5.0) as u8;

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

struct FlatWorldChunkGetter {}

impl FlatWorldChunkGetter {
    pub fn get_chunk(&self, chunk_pos: &ChunkPos) -> Chunk {
        let mut chunk = Chunk::new(*chunk_pos);
        for x in 0u8..CHUNK_WIDTH as u8 {
            for z in 0u8..CHUNK_WIDTH as u8 {
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

#[derive(Serialize, Deserialize)]
#[wasm_bindgen]
struct ParkorChunkGetter {
    #[wasm_bindgen(skip)]
    pub current_blocks: Vec<WorldBlock>,

    // how far away the blocks are generated from requested chunks
    pub load_distance: u8,
}

#[wasm_bindgen]
impl ParkorChunkGetter {
    pub fn new() -> ParkorChunkGetter {
        ParkorChunkGetter {
            current_blocks: Vec::new(),
            load_distance: 4,
        }
    }

    pub fn get_chunk_wasm(&mut self, chunk_x: i16, chunk_y: i16) -> Chunk {
        let chunk_pos = ChunkPos {
            x: chunk_x,
            y: chunk_y,
        };
        self.get_chunk(&chunk_pos)
    }
}

impl ParkorChunkGetter {
    pub fn get_next_block(&self) -> WorldBlock {
        let current_block = self.current_blocks.last();

        if let Some(block) = current_block {
            let block_pos = block.world_pos;

            // compute the next pos
            let next_pos = block_pos
                .move_direction(&Direction::North)
                .move_direction(&Direction::North);

            WorldBlock {
                world_pos: next_pos,
                block_type: BlockType::Stone,
                extra_data: block::BlockData::None,
            }
        } else {
            // return the first block
            WorldBlock {
                world_pos: WorldPos::new(0, 0, 0),
                block_type: BlockType::Stone,
                extra_data: block::BlockData::None,
            }
        }
    }

    fn load_chunk(&mut self, chunk_pos: &ChunkPos) {
        // check if there are any blocks in this chunk
        let next_block = self.get_next_block();

        let mut count = 0;

        // keep loading the next block until it isn't load distance away from me
        while next_block.world_pos.to_chunk_pos().distance_to(*chunk_pos) as u8
            <= self.load_distance
            && count < 10
        {
            self.current_blocks.push(next_block);
            let next_block = self.get_next_block();
            self.current_blocks.push(next_block);
            count += 1;
        }
    }

    pub fn get_chunk(&mut self, chunk_pos: &ChunkPos) -> Chunk {
        let mut chunk = Chunk::new(*chunk_pos);

        self.load_chunk(chunk_pos);

        for block in self.current_blocks.iter() {
            let block_chunk_pos = block.world_pos.to_chunk_pos();
            if block_chunk_pos == *chunk_pos {
                chunk.add_block(block.to_chunk_block());
            }
        }

        chunk
    }
}

#[wasm_bindgen]
pub struct TerrainGenerator {
    pub seed: u32,
    pub flat_world: bool,
}

#[wasm_bindgen]
impl TerrainGenerator {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u32, flat_world: bool) -> TerrainGenerator {
        TerrainGenerator { seed, flat_world }
    }

    pub fn get_chunk(&self, chunk_x: i16, chunk_y: i16) -> Chunk {
        let chunk_pos = ChunkPos {
            x: chunk_x,
            y: chunk_y,
        };

        if self.flat_world {
            let chunk_getter = FlatWorldChunkGetter {};
            return chunk_getter.get_chunk(&chunk_pos);
        }

        let chunk_getter = BasicChunkGetter::make(self.seed);
        chunk_getter.get_chunk(&chunk_pos)
    }
}
