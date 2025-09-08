use super::{
    entities::{EntityQuery, EntityQueryResults},
    game::{Game, GameSchedule},
    game_script::GameScript,
};
use crate::{
    chunk::chunk_fetcher::ChunkFetcher, components::fine_world_pos::FineWorldPos,
    positions::ChunkPos, world::World,
};
use serde::Serialize;
use serde_json;
use serde_wasm_bindgen;
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::JsValue;

pub trait RequestChunk: std::fmt::Debug {
    fn request_chunk(&self, chunk_pos: ChunkPos);
}

static NAME: &'static str = "sandbox";

#[derive(Debug, Serialize)]
#[wasm_bindgen]
pub struct SandBoxGScript {
    pub load_distance: u8,
}

impl Default for SandBoxGScript {
    fn default() -> Self {
        Self { load_distance: 2 }
    }
}

#[wasm_bindgen]
impl SandBoxGScript {
    #[wasm_bindgen(js_name = "name")]
    pub fn get_name_wasm() -> String {
        return NAME.to_string();
    }

    pub fn get_chunks_around_player(&self, pos: &FineWorldPos) -> Vec<ChunkPos> {
        let mut poses = vec![];

        let player_chunk_pos: ChunkPos = pos.to_world_pos().to_chunk_pos();

        for i in -(self.load_distance as i16)..=self.load_distance as i16 {
            for j in -(self.load_distance as i16)..=self.load_distance as i16 {
                let chunk_pos = player_chunk_pos + ChunkPos { x: i, y: j };
                poses.push(chunk_pos);
            }
        }

        poses
    }
}

impl GameScript for SandBoxGScript {
    fn get_name(&self) -> String {
        NAME.to_string()
    }

    fn get_config(&self) -> JsValue {
        let config = serde_json::json!({
            "load_distance": self.load_distance,
        });
        serde_wasm_bindgen::to_value(&config).unwrap()
    }

    fn set_config(&mut self, config: JsValue) {
        if let Ok(config_obj) = serde_wasm_bindgen::from_value::<serde_json::Value>(config.clone())
        {
            if let Some(load_distance) = config_obj.get("load_distance").and_then(|v| v.as_u64()) {
                self.load_distance = load_distance as u8;
            }
        }
        web_sys::console::log_1(&format!("SandBoxGScript config updated: {:?}", config).into());
    }

    fn get_query(&self) -> EntityQuery {
        let mut query = EntityQuery::new();
        query.add::<FineWorldPos>();
        query
    }

    fn update(
        &mut self,
        world: &World,
        query_results: EntityQueryResults,
        chunk_fetcher: &mut ChunkFetcher,
    ) -> Option<GameSchedule> {
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

        for chunk_pos in nearby_unloaded_chunks {
            chunk_fetcher.request_chunk(chunk_pos);
        }

        None
    }
}

pub mod wasm {
    use wasm_bindgen::JsValue;

    use super::*;

    #[wasm_bindgen]
    impl SandBoxGScript {
        #[wasm_bindgen(constructor)]
        pub fn new_wasm() -> SandBoxGScript {
            SandBoxGScript::default()
        }

        pub fn serialize(&self) -> Result<JsValue, serde_wasm_bindgen::Error> {
            let serialized = serde_wasm_bindgen::to_value(self).unwrap();
            Ok(serialized)
        }
    }
}
