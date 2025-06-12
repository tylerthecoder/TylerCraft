use super::entities::{EntityQuery, EntityQueryResults};
use super::entity::EntityId;
use super::game::{GameDiff, GameSchedule};
use crate::chunk::{chunk_fetcher::ChunkFetcher, ChunkId};
use crate::world::World;
use std::any::Any;
use std::fmt::Debug;
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::JsValue;

pub trait GameScript: Any + Debug {
    fn update(
        &mut self,
        _world: &World,
        _query_results: EntityQueryResults,
        _chunk_fetcher: &mut ChunkFetcher,
    ) -> Option<GameSchedule> {
        None
    }

    fn get_name(&self) -> String {
        "".to_string()
    }

    fn get_config(&self) -> JsValue {
        JsValue::null()
    }

    fn set_config(&mut self, _config: JsValue) {
        // Default implementation does nothing
    }

    fn get_query(&self) -> EntityQuery {
        EntityQuery::new()
    }

    fn on_chunk_update(&self, _chunk_id: ChunkId) {
        // Default implementation does nothing
    }

    fn on_entity_update(&self, _entity_id: EntityId) {
        // Default implementation does nothing
    }
}

impl std::error::Error for ScriptNotFoundError {}

#[derive(Debug)]
pub struct ScriptNotFoundError {
    pub entity_id: EntityId,
    pub script_name: String,
}

impl std::fmt::Display for ScriptNotFoundError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Script '{}' not found for entity with ID {}",
            self.script_name, self.entity_id
        )
    }
}

#[derive(Debug, Default)]
#[wasm_bindgen]
pub struct GameScripts {
    scripts: Vec<Box<dyn GameScript>>,
}

impl GameScripts {
    pub fn add_script(&mut self, script: Box<dyn GameScript>) {
        self.scripts.push(script);
    }

    pub fn get_scripts_mut(&mut self) -> &mut Vec<Box<dyn GameScript>> {
        &mut self.scripts
    }

    pub fn iter_mut(&mut self) -> std::slice::IterMut<Box<dyn GameScript>> {
        self.scripts.iter_mut()
    }

    pub fn get_all_script_names(&self) -> Vec<String> {
        self.scripts
            .iter()
            .map(|script| script.get_name())
            .collect()
    }

    pub fn get_script_config(&self, script_name: String) -> JsValue {
        for script in self.scripts.iter() {
            if script.get_name() == script_name {
                return script.get_config();
            }
        }
        JsValue::null()
    }

    pub fn set_script_config(&mut self, script_name: String, config: JsValue) {
        for script in self.scripts.iter_mut() {
            if script.get_name() == script_name {
                script.set_config(config);
                break;
            }
        }
    }
}

#[wasm_bindgen]
#[derive(Debug)]
pub struct WasmGameScript {
    name: String,
    context: JsValue,
    get_config_jsfn: js_sys::Function,
    set_config_jsfn: js_sys::Function,
    on_chunk_update_jsfn: js_sys::Function,
    on_entity_update_jsfn: js_sys::Function,
}

#[wasm_bindgen]
impl WasmGameScript {
    #[wasm_bindgen(constructor)]
    pub fn make(val: JsValue) -> WasmGameScript {
        let on_chunk_update_jsfn =
            js_sys::Reflect::get(&val, &JsValue::from("onChunkUpdate")).unwrap();
        let on_entity_update_jsfn =
            js_sys::Reflect::get(&val, &JsValue::from("onEntityUpdate")).unwrap();
        let name = js_sys::Reflect::get(&val, &JsValue::from("name")).unwrap();
        let get_config_jsfn = js_sys::Reflect::get(&val, &JsValue::from("getConfig")).unwrap();
        let set_config_jsfn = js_sys::Reflect::get(&val, &JsValue::from("setConfig")).unwrap();
        WasmGameScript {
            name: name.as_string().unwrap(),
            on_chunk_update_jsfn: on_chunk_update_jsfn.into(),
            on_entity_update_jsfn: on_entity_update_jsfn.into(),
            get_config_jsfn: get_config_jsfn.into(),
            set_config_jsfn: set_config_jsfn.into(),
            context: val,
        }
    }
}

impl GameScript for WasmGameScript {
    fn update(
        &mut self,
        _world: &World,
        _query_results: EntityQueryResults,
        _chunk_fetcher: &mut ChunkFetcher,
    ) -> Option<GameSchedule> {
        None
    }

    fn get_name(&self) -> String {
        self.name.clone()
    }

    fn get_config(&self) -> JsValue {
        self.get_config_jsfn.call0(&self.context).unwrap()
    }

    fn set_config(&mut self, config: JsValue) {
        self.set_config_jsfn.call1(&self.context, &config).unwrap();
    }

    fn on_chunk_update(&self, chunk_id: ChunkId) {
        let val = serde_wasm_bindgen::to_value(&chunk_id).unwrap();
        self.on_chunk_update_jsfn
            .call1(&self.context, &val)
            .unwrap();
    }

    fn on_entity_update(&self, entity_id: EntityId) {
        let val = serde_wasm_bindgen::to_value(&entity_id).unwrap();
        self.on_entity_update_jsfn
            .call1(&self.context, &val)
            .unwrap();
    }
}
