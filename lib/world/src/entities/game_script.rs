use super::entities::{EntityQuery, EntityQueryResults};
use super::entity::EntityId;
use super::game::GameSchedule;
use crate::chunk::{chunk_fetcher::ChunkFetcher, ChunkId};
use crate::entities::fireball::FireballScript;
use crate::entities::player_gravity_script::GravityScript;
use crate::entities::player_move_script::MoveScript;
use crate::entities::sandbox::SandBoxGScript;
use crate::entities::velocity_script::VelocityScript;
use crate::utils::js_log;
use crate::world::World;
use js_sys::JSON;
use lazy_static::lazy_static;
use serde::ser::SerializeStruct;
use serde::{de, Deserialize, Deserializer, Serialize, Serializer};
use serde_json::{from_value, to_value, Value};
use std::any::Any;
use std::cell::RefCell;
use std::collections::HashMap;
use std::fmt::Debug;
use std::sync::Mutex;
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::{JsCast, JsValue};

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

    fn get_state_wasm(&self) -> JsValue {
        JsValue::null()
    }

    fn set_state_wasm(&mut self, _val: JsValue) {
        // no-op
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

impl Clone for GameScripts {
    fn clone(&self) -> Self {
        let serial = to_value(self).unwrap();

        from_value(serial).unwrap()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GameScriptSerial {
    name: String,
    config: String,
}

impl Serialize for GameScripts {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut s = serializer.serialize_struct("GameScripts", 1)?;

        let scripts: Vec<_> = self
            .scripts
            .iter()
            .map(|s| {
                let name = s.get_name();
                let js_config = s.get_config();
                let config: String = JSON::stringify(&js_config).unwrap().into();
                js_log(&format!(
                    "Serialize script: {:?} {:?} {:?}",
                    name, js_config, config
                ));

                return GameScriptSerial { name, config };
            })
            .collect();

        s.serialize_field("scripts", &scripts);
        s.end()
    }
}

impl<'de> Deserialize<'de> for GameScripts {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        #[derive(Deserialize)]
        struct GameScriptHelper {
            scripts: Vec<GameScriptSerial>,
        }

        let GameScriptHelper { scripts } = GameScriptHelper::deserialize(deserializer)?;

        js_log(&format!("All Scripts: {:?}", scripts));

        let mut game_scripts = GameScripts { scripts: vec![] };

        let registry = SCRIPT_REGISTRY.lock().unwrap();
        for key in registry.keys() {
            js_log(&format!("regkey: {:?}", key));
        }
        for item in scripts {
            let js_config: JsValue = JSON::parse(&item.config).unwrap();

            js_log(&format!("value: {:?}", js_config));

            let deser = registry
                .get(item.name.as_str())
                .ok_or_else(|| de::Error::custom(format!("Unknown game script: {}", item.name)))?;

            let mut val = deser();

            val.set_config(js_config);

            game_scripts.scripts.push(val);
        }

        Ok(game_scripts)
    }
}

impl GameScripts {
    pub fn add_script(&mut self, script: Box<dyn GameScript>) {
        self.scripts.push(script);
    }

    pub fn get_script_by_name(&self, script_name: String) -> Option<&Box<dyn GameScript>> {
        for script in self.scripts.iter() {
            if script.get_name() == script_name {
                return Some(script);
            }
        }
        None
    }

    pub fn get_script_by_name_mut(
        &mut self,
        script_name: String,
    ) -> Option<&mut Box<dyn GameScript>> {
        for script in self.scripts.iter_mut() {
            if script.get_name() == script_name {
                return Some(script);
            }
        }
        None
    }

    pub fn get_scripts_mut(&mut self) -> &mut Vec<Box<dyn GameScript>> {
        &mut self.scripts
    }

    pub fn iter_mut(&mut self) -> std::slice::IterMut<Box<dyn GameScript>> {
        self.scripts.iter_mut()
    }
}

#[wasm_bindgen]
impl GameScripts {
    pub fn ensure_script(&mut self, script_name: String) -> () {
        let existing = self.get_script_by_name(script_name.clone());
        if existing.is_some() {
            ()
        }
        let registry = SCRIPT_REGISTRY.lock().unwrap();

        let builder = registry.get(&script_name);
        if let Some(builder_found) = builder {
            let game_script = builder_found();
            js_log("Found rust script");
            self.add_script(game_script);
            return;
        }

        let binding = WASM_SCRIPT_REGISTERY.take();
        for key in binding.keys() {
            js_log(&format!("Keys {:?}", key));
        }
        let wasm_builder = binding.get(&script_name);
        if let Some(wasm_found) = wasm_builder {
            js_log("Found js script");
            let script = wasm_found();
            self.add_script(script);
            return;
        }

        panic!("Script {:?} not found in registry", script_name);
    }

    pub fn get_script_state(&mut self, script_name: String) -> JsValue {
        let script = self.get_script_by_name_mut(script_name.clone()).unwrap();

        script.get_state_wasm()
    }

    pub fn set_script_state(&mut self, script_name: String, state: JsValue) {
        let script = self.get_script_by_name_mut(script_name.clone()).unwrap();

        script.set_state_wasm(state);
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
impl GameScripts {
    pub fn to_js(&self) -> Result<JsValue, serde_wasm_bindgen::Error> {
        serde_wasm_bindgen::to_value(self)
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

    fn get_state_wasm(&self) -> JsValue {
        self.context.clone()
    }

    fn set_state_wasm(&mut self, val: JsValue) {
        self.context = val;
    }
}

type ScriptDeserializer = fn() -> Box<dyn GameScript>;

lazy_static! {
    pub static ref SCRIPT_REGISTRY: Mutex<HashMap<String, ScriptDeserializer>> = {
        let mut map = HashMap::new();
        fn register<T: GameScript + Default + 'static>( map: &mut HashMap<String, ScriptDeserializer>, ) {
            fn deser<T: GameScript + Default + 'static>() -> Box<dyn GameScript> {
                Box::new(T::default())
            }
            let key = T::default().get_name();
            map.insert(key, deser::<T>);
        }
        // Register all the scripts!
        register::<GravityScript>(&mut map);
        register::<MoveScript>(&mut map);
        register::<VelocityScript>(&mut map);
        register::<FireballScript>(&mut map);
        register::<SandBoxGScript>(&mut map);
        Mutex::new(map)
    };
}

thread_local! {
    static WASM_SCRIPT_REGISTERY: RefCell<HashMap<String, WasmScriptDeserializer>> =
        RefCell::new(HashMap::new());
}

thread_local! {
    static WASM_SCRIPT_DEFAULT_CONFIG_REGISTERY: RefCell<HashMap<String, JsValue>> =
        RefCell::new(HashMap::new());
}

type WasmScriptDeserializer = Box<dyn Fn() -> Box<dyn GameScript>>;

#[wasm_bindgen]
pub fn add_script_to_registry(game_script_class: JsValue) {
    let name = js_sys::Reflect::get(&game_script_class, &JsValue::from("name"))
        .unwrap()
        .as_string()
        .unwrap();

    let factory: js_sys::Function = game_script_class
        .dyn_into()
        .expect("argument must be a class/constructor Function");

    let des: WasmScriptDeserializer = Box::new(move || -> Box<dyn GameScript> {
        let args = {
            let a = js_sys::Array::new();
            a
        };

        let js_obj =
            js_sys::Reflect::construct(&factory, &args).expect("constructing script failed");

        let js_game_script = WasmGameScript::make(js_obj);
        Box::new(js_game_script)
    });

    WASM_SCRIPT_REGISTERY.with(|reg| {
        reg.borrow_mut().insert(name.clone(), des);
    });
}
