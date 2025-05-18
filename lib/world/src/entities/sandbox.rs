use super::{
    entity::{EntityQuery, EntityQueryResults},
    game::{Game, GameDiff, GameSchedule},
    game_script::GameScript,
    terrain_gen::TerrainGenerator,
};
use crate::{components::fine_world_pos::FineWorldPos, positions::ChunkPos, world::World};

#[derive(Debug)]
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
            terrain_gen: TerrainGenerator::new(0, false, false),
        }
    }
}

impl SandBoxGScript {
    pub fn new(
        seed: u32,
        flat_world: bool,
        debug_world: bool,
        load_distance: u8,
    ) -> SandBoxGScript {
        SandBoxGScript {
            seed,
            flat_world,
            load_distance,
            terrain_gen: TerrainGenerator::new(seed, flat_world, debug_world),
        }
    }

    fn get_chunks_around_player(&self, pos: &FineWorldPos) -> Vec<ChunkPos> {
        let mut poses = vec![];

        let player_chunk_pos: ChunkPos = pos.to_world_pos().to_chunk_pos();

        for i in -(self.load_distance as i16)..self.load_distance as i16 {
            for j in -(self.load_distance as i16)..self.load_distance as i16 {
                let chunk_pos = player_chunk_pos + ChunkPos { x: i, y: j };
                poses.push(chunk_pos);
            }
        }

        poses
    }
}

impl GameScript for SandBoxGScript {
    fn get_query(&self) -> EntityQuery {
        let mut query = EntityQuery::new();
        query.add::<FineWorldPos>();
        query
    }

    fn update(&mut self, world: &World, query_results: EntityQueryResults) -> Option<GameSchedule> {
        let entity_poses: Vec<FineWorldPos> = query_results
            .entities
            .iter()
            .map(|ent| ent.get::<FineWorldPos>().unwrap().clone())
            .collect();

        let nearby_unloaded_chunks: Vec<ChunkPos> = entity_poses
            .iter()
            .flat_map(|p| self.get_chunks_around_player(p))
            .filter(|pos| !world.has_chunk(pos))
            .collect();

        // only load the first chunk
        let chunk_pos = nearby_unloaded_chunks.first();

        let mut gdiff = GameSchedule::empty();

        if let Some(chunk_pos) = chunk_pos {
            let chunk = self.terrain_gen.get_chunk(chunk_pos.x, chunk_pos.y);
            gdiff.add_chunk(chunk);
        }

        Some(gdiff)
    }
}
