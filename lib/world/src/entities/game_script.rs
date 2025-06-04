use super::entities::{EntityQuery, EntityQueryResults};
use super::entity::EntityId;
use super::game::{GameDiff, GameSchedule};
use crate::chunk::ChunkId;
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
    ) -> Option<GameSchedule> {
        None
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
pub struct EntityScriptHolder {
    scripts: Vec<Box<dyn GameScript>>,
}

impl EntityScriptHolder {
    pub fn add_script(&mut self, script: Box<dyn GameScript>) {
        self.scripts.push(script);
    }

    pub fn get_scripts_mut(&mut self) -> &mut Vec<Box<dyn GameScript>> {
        &mut self.scripts
    }

    pub fn iter_mut(&mut self) -> std::slice::IterMut<Box<dyn GameScript>> {
        self.scripts.iter_mut()
    }
}

#[wasm_bindgen]
#[derive(Debug)]
pub struct WasmGameScript {
    context: JsValue,
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
        WasmGameScript {
            on_chunk_update_jsfn: on_chunk_update_jsfn.into(),
            on_entity_update_jsfn: on_entity_update_jsfn.into(),
            context: val,
        }
    }
}

impl GameScript for WasmGameScript {
    fn update(
        &mut self,
        _world: &World,
        _query_results: EntityQueryResults,
    ) -> Option<GameSchedule> {
        None
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
