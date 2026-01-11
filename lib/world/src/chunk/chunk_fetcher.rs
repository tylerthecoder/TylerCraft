use crate::chunk::chunk_pos::ChunkPos;
use crate::game::Game;
use crate::terrain_gen::TerrainGenerator;
use crate::{chunk::chunk::Chunk, utils::js_log};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, RequestMode, Response};

#[derive(Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct ChunkFetcher {
    chunks_to_load: Vec<ChunkPos>,
    chunk_loader: ChunkLoader,
}

#[derive(Clone, Serialize, Deserialize)]
pub enum ChunkLoader {
    TerrainGenerator(TerrainGenerator),
    Server(ServerChunkLoader),
}

impl ChunkFetcher {
    pub fn new(chunk_loader: ChunkLoader) -> Self {
        Self {
            chunks_to_load: Vec::new(),
            chunk_loader,
        }
    }

    pub fn request_chunk(&mut self, chunk_pos: ChunkPos) {
        js_log(&format!(
            "chunk_fetcher.rs: Requesting chunk: {:?}",
            chunk_pos
        ));
        if self.chunks_to_load.iter().any(|pos| pos == &chunk_pos) {
            return;
        }
        self.chunks_to_load.push(chunk_pos);
    }

    pub async fn consume_single_chunk(&mut self) -> Option<Chunk> {
        let chunk_pos = self.chunks_to_load.pop()?;
        match &self.chunk_loader {
            ChunkLoader::TerrainGenerator(loader) => {
                let chunk = loader.get_chunk(chunk_pos.x, chunk_pos.y);
                Some(chunk)
            }
            ChunkLoader::Server(loader) => {
                let chunk = loader.load_chunk(chunk_pos).await.unwrap();
                Some(chunk)
            }
        }
    }

    pub fn get_chunk_to_load_count(&self) -> usize {
        self.chunks_to_load.len()
    }
}

#[wasm_bindgen]
impl ChunkFetcher {
    #[wasm_bindgen(js_name = "makeFromTerrainGenerator")]
    pub fn make_from_terrain_generator(loader: TerrainGenerator) -> Self {
        Self::new(ChunkLoader::TerrainGenerator(loader))
    }

    #[wasm_bindgen(js_name = "makeFromServerChunkLoader")]
    pub fn make_from_server_chunk_loader(loader: ServerChunkLoader) -> Self {
        Self::new(ChunkLoader::Server(loader))
    }

    #[wasm_bindgen(js_name = "deserialize")]
    pub fn deserialize(js_value: JsValue) -> Result<Self, JsValue> {
        serde_wasm_bindgen::from_value(js_value)
            .map_err(|e| JsValue::from_str(&format!("Failed to deserialize ChunkFetcher: {}", e)))
    }
}

#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(js_name = "setChunkFetcherConfig")]
    pub fn set_chunk_fetcher_config(&mut self, config: JsValue) {
        self.chunk_fetcher.chunk_loader = serde_wasm_bindgen::from_value(config).unwrap();
    }

    #[wasm_bindgen(js_name = "serializeChunkFetcher")]
    pub fn serialize(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(&self.chunk_fetcher)
            .map_err(|_| JsValue::from_str("Failed to serialize ChunkFetcher"))
    }

    #[wasm_bindgen(js_name = "getPendingChunkCount")]
    pub fn get_pending_chunk_count(&self) -> usize {
        self.chunk_fetcher.chunks_to_load.len()
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct ServerChunkLoader {
    base_url: String,
    game_id: String,
}

#[wasm_bindgen]
impl ServerChunkLoader {
    #[wasm_bindgen(constructor)]
    pub fn new(base_url: String, game_id: String) -> Self {
        Self { base_url, game_id }
    }
}

impl ServerChunkLoader {
    pub async fn load_chunk(&self, chunk_pos: ChunkPos) -> Result<Chunk, JsValue> {
        let url = format!(
            "{}/game/{}/chunk/{}/{}",
            self.base_url, self.game_id, chunk_pos.x, chunk_pos.y
        );

        let opts = RequestInit::new();
        opts.set_method("GET");
        opts.set_mode(RequestMode::Cors);

        let request = Request::new_with_str_and_init(&url, &opts)?;

        request
            .headers()
            .set("Accept", "application/vnd.github.v3+json")?;

        let window = web_sys::window().unwrap();
        let resp_value = JsFuture::from(window.fetch_with_request(&request)).await?;

        // `resp_value` is a `Response` object.
        assert!(resp_value.is_instance_of::<Response>());
        let resp: Response = resp_value.dyn_into().unwrap();

        // Convert this other `Promise` into a rust `Future`.
        let json = JsFuture::from(resp.json()?).await?;

        let chunk = Chunk::deserialize(json)?;

        // Send the JSON response back to JS.
        Ok(chunk)
    }
}
