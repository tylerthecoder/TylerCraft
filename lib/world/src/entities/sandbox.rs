use wasm_bindgen::prelude::wasm_bindgen;

use super::{
    entity::{EntityQuery, EntityQueryResults},
    game::{Game, GameDiff, GameSchedule},
    game_script::GameScript,
    terrain_gen::TerrainGenerator,
};
use crate::{components::fine_world_pos::FineWorldPos, positions::ChunkPos, world::World};

pub trait RequestChunk: std::fmt::Debug {
    fn request_chunk(&self, chunk_pos: ChunkPos);
}

#[derive(Debug)]
#[wasm_bindgen]
pub struct SandBoxGScript {
    pub load_distance: u8,
    request_chunk: Box<dyn RequestChunk>,
    // pub terrain_gen: TerrainGenerator,
}

impl SandBoxGScript {
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

        // let mut gdiff = GameSchedule::empty();

        if let Some(chunk_pos) = chunk_pos {
            self.request_chunk.request_chunk(*chunk_pos);
        }

        None
    }
}

pub mod wasm {
    use wasm_bindgen::JsValue;

    use super::*;

    #[wasm_bindgen]
    #[derive(Debug)]
    pub struct WasmRequestChunk {
        request_chunk: js_sys::Function,
    }

    #[wasm_bindgen]
    impl WasmRequestChunk {
        #[wasm_bindgen(constructor)]
        pub fn new(request_chunk: js_sys::Function) -> WasmRequestChunk {
            WasmRequestChunk { request_chunk }
        }
    }

    impl RequestChunk for WasmRequestChunk {
        fn request_chunk(&self, chunk_pos: ChunkPos) {
            let val = serde_wasm_bindgen::to_value(&chunk_pos).unwrap();
            let context = JsValue::NULL;
            self.request_chunk.call1(&context, &val).unwrap();
        }
    }

    #[wasm_bindgen]
    impl SandBoxGScript {
        #[wasm_bindgen(constructor)]

        pub fn new_wasm(load_distance: u8, wasm_request_chunk: WasmRequestChunk) -> SandBoxGScript {
            SandBoxGScript {
                load_distance,
                request_chunk: Box::new(wasm_request_chunk),
            }
        }
    }

    #[wasm_bindgen]
    impl Game {
        pub fn add_sandbox_wasm(&mut self, sandbox_game_script: SandBoxGScript) {
            self.add_script(Box::new(sandbox_game_script));
        }
    }
}
