use super::{
    game::{Game, GameDiff, GameScript},
    player::Player,
    terrain_gen::TerrainGenerator,
};
use crate::{positions::ChunkPos, world::World};

pub struct SandBoxGScript {
    seed: u32,
    flat_world: bool,
    load_distance: u8,
    terrain_gen: TerrainGenerator,
}

impl Default for SandBoxGScript {
    fn default() -> Self {
        SandBoxGScript {
            seed: 0,
            flat_world: false,
            load_distance: 1,
            terrain_gen: TerrainGenerator::new(0, false),
        }
    }
}

impl SandBoxGScript {
    pub fn new(seed: u32, flat_world: bool, infinite: bool, load_distance: u8) -> SandBoxGScript {
        SandBoxGScript {
            seed,
            flat_world,
            load_distance,
            terrain_gen: TerrainGenerator::new(seed, flat_world),
        }
    }

    fn get_chunks_around_player(&self, player: &Player) -> Vec<ChunkPos> {
        let mut poses = vec![];

        let player_chunk_pos: ChunkPos = player.pos.to_world_pos().to_chunk_pos();

        for i in -(self.load_distance as i16)..self.load_distance as i16 {
            for j in -(self.load_distance as i16)..self.load_distance as i16 {
                let chunk_pos = player_chunk_pos + ChunkPos { x: i, y: j };
                poses.push(chunk_pos);
            }
        }

        poses
    }

    fn load_chunks_around_player(&self, players: &Vec<Box<Player>>, world: &World) -> GameDiff {
        let nearby_unloaded_chunks: Vec<ChunkPos> = players
            .iter()
            .flat_map(|p| self.get_chunks_around_player(p))
            .filter(|pos| !world.has_chunk(pos))
            .collect();

        // only load the first chunk
        let chunk_pos = nearby_unloaded_chunks.first();

        let mut gdiff = GameDiff::empty();

        if let Some(chunk_pos) = chunk_pos {
            let chunk = self.terrain_gen.get_chunk(chunk_pos.x, chunk_pos.y);
            gdiff.add_chunk(Box::new(chunk));
        }

        gdiff
    }
}

impl GameScript for SandBoxGScript {
    fn update(&self, world: &World, ents: &Vec<Box<Player>>, _delta: u8) -> GameDiff {
        self.load_chunks_around_player(ents, world)
    }

    fn on_diff(&self, _diff: &GameDiff) -> () {
        // on diff
    }
}
