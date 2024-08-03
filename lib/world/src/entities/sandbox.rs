use super::{
    player::{Game, GameScript, Player},
    terrain_gen::TerrainGenerator,
};
use crate::{positions::ChunkPos, world::World};

struct SandBoxGScript {
    seed: u32,
    flat_world: bool,
    load_distance: u8,
    terrain_gen: TerrainGenerator,
}

impl SandBoxGScript {
    pub fn new(seed: u32, flat_world: bool, infinite: bool, load_distance: u8) -> SandBoxGScript {
        SandBoxGScript {
            seed,
            flat_world,
            load_distance,
        }
    }

    fn get_chunks_around_player(&self, player: &Player) -> Vec<ChunkPos> {
        let poses = vec![];

        let player_chunk_pos: ChunkPos = player.pos.to_chunk_pos();

        for i in -(self.load_distance as i16)..self.load_distance as i16 {
            for j in -(self.load_distance as i16)..self.load_distance as i16 {
                let chunk_pos = player_chunk_pos + ChunkPos { x: i, y: j };
                poses.push(chunk_pos);
            }
        }

        poses
    }

    fn load_chunks_around_player(&self, players: Vec<&Player>, game: &mut Game) -> () {
        let nearby_unloaded_chunks: Vec<ChunkPos> = players
            .iter()
            .flat_map(|p| self.get_chunks_around_player(p))
            .filter(|pos| !world.is_chunk_loaded(pos))
            .collect();

        // only load the first chunk
        let chunk_pos = nearby_unloaded_chunks.first();

        if let Some(chunk_pos) = chunk_pos {
            let chunk = self.terrain_gen.get_chunk(chunk_pos.x, chunk_pos.y);
            game.schedule_chunk_insert(Box::new(chunk));
        }
    }
}

impl GameScript for SandBoxGScript {
    fn update(&self, game: &Game, delta: u8) -> () {
        let ents = game.get_entities();

        // for ent in ents {
        //     let mut any_ent = *ent.to_owned().borrow_mut();
        //
        //     // downcast to player
        //     if let Some(player) = any_ent
        //         // do something with player
        //     }
        // }
    }
}
