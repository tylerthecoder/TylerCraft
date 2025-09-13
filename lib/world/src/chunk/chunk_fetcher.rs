use crate::chunk::Chunk;
use crate::entities::game::Game;
use crate::entities::terrain_gen::TerrainGenerator;
use crate::positions::ChunkPos;
use lazy_static::lazy_static;
use serde::{ser::SerializeStruct, Deserialize, Deserializer, Serialize, Serializer};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;
use wasm_bindgen::prelude::*;

#[derive(Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct ChunkFetcher {
    loaded_chunks: Vec<(ChunkPos, Chunk)>,
    chunk_loader: Box<dyn ChunkLoader>,
}

impl ChunkFetcher {
    pub fn new(chunk_loader: Box<dyn ChunkLoader>) -> Self {
        Self {
            loaded_chunks: Vec::new(),
            chunk_loader,
        }
    }

    pub fn request_chunk(&mut self, chunk_pos: ChunkPos) {
        if self.loaded_chunks.iter().any(|(pos, _)| pos == &chunk_pos) {
            return;
        }

        let chunk = self.chunk_loader.load_chunk(chunk_pos);
        self.loaded_chunks.push((chunk_pos, chunk));
    }

    pub fn consume_single_chunk(&mut self) -> Option<Chunk> {
        self.loaded_chunks.pop().map(|(_, chunk)| chunk)
    }
}

#[wasm_bindgen]
impl ChunkFetcher {
    #[wasm_bindgen(constructor)]
    pub fn new_wasm(gen: TerrainGenerator) -> Self {
        Self::new(Box::new(gen))
    }

    pub fn get_config(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.chunk_loader).unwrap()
    }

    #[wasm_bindgen(js_name = "fromJs")]
    pub fn from_js(value: JsValue) -> Self {
        Self::new(serde_wasm_bindgen::from_value(value).unwrap())
    }
}

#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(js_name = "setChunkFetcherConfig")]
    pub fn set_chunk_fetcher_config(&mut self, config: JsValue) {
        self.chunk_fetcher.chunk_loader = serde_wasm_bindgen::from_value(config).unwrap();
    }
}

pub trait ChunkLoader {
    fn load_chunk(&self, chunk_pos: ChunkPos) -> Chunk;
    fn clone_box(&self) -> Box<dyn ChunkLoader>;
    fn type_name(&self) -> &'static str {
        std::any::type_name::<Self>()
    }
    fn to_json(&self) -> serde_json::Value;
    fn to_js(&self) -> JsValue;
}

impl Clone for Box<dyn ChunkLoader> {
    fn clone(&self) -> Self {
        self.clone_box()
    }
}

impl Serialize for Box<dyn ChunkLoader> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut s = serializer.serialize_struct("ChunkLoader", 2)?;
        s.serialize_field("type", &self.type_name())?;
        s.serialize_field("json", &self.to_json())?;
        s.end()
    }
}

#[derive(Deserialize)]
struct ChunkLoaderHelper {
    #[serde(rename = "type")]
    type_name: String,
    json: Value,
}

impl<'de> Deserialize<'de> for Box<dyn ChunkLoader> {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let helper = ChunkLoaderHelper::deserialize(deserializer)?;
        let registry = CHUNK_LOADER_REGISTRY.lock().unwrap();
        let deserializer_fn = registry.get(helper.type_name.as_str()).ok_or_else(|| {
            serde::de::Error::custom(format!("Unknown ChunkLoader type: {}", helper.type_name))
        })?;
        Ok(deserializer_fn(helper.json))
    }
}

type ChunkLoaderDeserializer = fn(Value) -> Box<dyn ChunkLoader>;

lazy_static! {
    static ref CHUNK_LOADER_REGISTRY: Mutex<HashMap<&'static str, ChunkLoaderDeserializer>> = {
        let mut map = HashMap::new();

        fn register<T: ChunkLoader + serde::de::DeserializeOwned + 'static>(
            map: &mut HashMap<&'static str, ChunkLoaderDeserializer>,
        ) {
            fn deser<T: ChunkLoader + serde::de::DeserializeOwned + 'static>(
                v: Value,
            ) -> Box<dyn ChunkLoader> {
                Box::new(serde_json::from_value::<T>(v).unwrap())
            }

            map.insert(std::any::type_name::<T>(), deser::<T>);
        }

        register::<TerrainGenerator>(&mut map);

        Mutex::new(map)
    };
}
