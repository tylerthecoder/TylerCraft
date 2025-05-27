use super::entities::{EntityQuery, EntityQueryResults};
use super::entity::EntityId;
use super::game::{GameDiff, GameSchedule};
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

    fn on_diff(&self, _diff: GameDiff) {
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
    on_diff_jsfn: js_sys::Function,
}

#[wasm_bindgen]
impl WasmGameScript {
    #[wasm_bindgen(constructor)]
    pub fn make(val: JsValue) -> WasmGameScript {
        let on_diff_jsfn = js_sys::Reflect::get(&val, &JsValue::from("onDiff")).unwrap();
        WasmGameScript {
            on_diff_jsfn: on_diff_jsfn.into(),
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

    fn on_diff(&self, diff: GameDiff) -> () {
        // console log diff
        let val = serde_wasm_bindgen::to_value(&diff).unwrap();
        self.on_diff_jsfn.call1(&self.context, &val).unwrap();
    }
}
