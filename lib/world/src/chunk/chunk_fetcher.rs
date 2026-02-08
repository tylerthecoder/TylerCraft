use crate::chunk::chunk_pos::ChunkPos;
use crate::game::Game;
use crate::terrain_gen::TerrainGenerator;
use crate::{chunk::chunk::Chunk, utils::js_log};
use js_sys;
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, RequestMode, Response};

/// Shared state for tracking an in-flight async chunk load
type InFlightResult = Rc<RefCell<Option<Result<Chunk, String>>>>;

/// An in-flight chunk request with its position and result state
#[derive(Clone)]
struct InFlightChunk {
    pos: ChunkPos,
    result: InFlightResult,
}

#[derive(Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct ChunkFetcher {
    chunks_to_load: Vec<ChunkPos>,
    chunk_loader: ChunkLoader,
    /// Tracks all currently loading chunks (not serialized)
    #[serde(skip)]
    in_flight: Vec<InFlightChunk>,
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
            in_flight: Vec::new(),
        }
    }

    pub fn request_chunk(&mut self, chunk_pos: ChunkPos) {
        // Check if already queued
        if self.chunks_to_load.iter().any(|pos| pos == &chunk_pos) {
            return;
        }
        // Check if already in-flight
        if self
            .in_flight
            .iter()
            .any(|inflight| inflight.pos == chunk_pos)
        {
            return;
        }
        js_log(&format!(
            "chunk_fetcher.rs: Requesting chunk: {:?}",
            chunk_pos
        ));
        self.chunks_to_load.push(chunk_pos);
    }

    /// Attempts to get a loaded chunk. Returns `Some(chunk)` if one is ready,
    /// or `None` if still loading or no chunks are pending.
    ///
    /// For server-loaded chunks, this spawns async fetches in the background
    /// and returns chunks as they complete on subsequent calls.
    pub fn consume_single_chunk(&mut self) -> Option<Chunk> {
        // 1. Check if any in-flight request has completed
        let mut completed_index = None;
        for (i, in_flight) in self.in_flight.iter().enumerate() {
            if in_flight.result.borrow().is_some() {
                completed_index = Some(i);
                break;
            }
        }

        if let Some(index) = completed_index {
            let in_flight = self.in_flight.remove(index);
            let result = in_flight.result.borrow_mut().take().unwrap();
            match result {
                Ok(chunk) => return Some(chunk),
                Err(e) => {
                    js_log(&format!("Chunk load failed: {}", e));
                    // Continue to try starting new requests or check other in-flight
                }
            }
        }

        // 2. Start new requests for any pending chunks
        while let Some(chunk_pos) = self.chunks_to_load.pop() {
            match &self.chunk_loader {
                ChunkLoader::TerrainGenerator(loader) => {
                    // Sync case - return immediately
                    return Some(loader.get_chunk(chunk_pos.x, chunk_pos.y));
                }
                ChunkLoader::Server(loader) => {
                    // Async case - spawn background task
                    let result: InFlightResult = Rc::new(RefCell::new(None));
                    let result_clone = result.clone();
                    let loader_clone = loader.clone();

                    wasm_bindgen_futures::spawn_local(async move {
                        let fetch_result = loader_clone.load_chunk(chunk_pos).await;
                        let mapped = fetch_result.map_err(|e| format!("{:?}", e));
                        *result_clone.borrow_mut() = Some(mapped);
                    });

                    self.in_flight.push(InFlightChunk {
                        pos: chunk_pos,
                        result,
                    });
                }
            }
        }

        None // No chunks ready yet
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
        self.chunk_fetcher.chunks_to_load.len() + self.chunk_fetcher.in_flight.len()
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

        loop {
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

            // Handle not found - wait and retry
            if resp.status() == 404 {
                js_log(&format!(
                    "Chunk requested at ({}, {}), retrying in 1 second...",
                    chunk_pos.x, chunk_pos.y
                ));
                // Sleep for 1 second before retrying
                let promise = js_sys::Promise::new(&mut |resolve, _| {
                    let window = web_sys::window().unwrap();
                    window
                        .set_timeout_with_callback_and_timeout_and_arguments_0(&resolve, 1000)
                        .unwrap();
                });
                JsFuture::from(promise).await?;
                continue;
            }

            // Convert this other `Promise` into a rust `Future`.
            let json = JsFuture::from(resp.json()?).await?;

            let chunk = Chunk::deserialize(json)?;

            // Send the JSON response back to JS.
            return Ok(chunk);
        }
    }
}
