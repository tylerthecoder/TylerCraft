use crate::chunk::chunk::ChunkId;
use crate::chunk::chunk_fetcher::ChunkFetcher;
use crate::entities::entities::{Entities, EntityQuery, EntityQueryResults};
use crate::entities::entity::EntityId;
use crate::entities::fireball::FireballScript;
use crate::game::Game;
use crate::game::GameSchedule;
use crate::scripts::player_gravity_script::GravityScript;
use crate::scripts::player_move_script::MoveScript;
use crate::scripts::sandbox::SandBoxGScript;
use crate::scripts::velocity_script::VelocityScript;
use crate::utils::js_log;
use crate::world::World;
use js_sys::JSON;
use lazy_static::lazy_static;
use serde::ser::SerializeStruct;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::{from_value, to_value};
use std::any::Any;
use std::cell::RefCell;
use std::collections::HashMap;
use std::fmt::Debug;
use std::sync::Mutex;
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::{JsCast, JsValue};

pub trait GameScript: Any + Debug {
    fn on_script_mounted(
        &mut self,
        _world: &World,
        _entities: &Entities,
        _chunk_fetcher: &mut ChunkFetcher,
    ) {
        // Default implementation does nothing
    }

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
    scripts_to_add: Vec<Box<dyn GameScript>>,
}

impl Clone for GameScripts {
    fn clone(&self) -> Self {
        js_log("cloning");
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

        s.serialize_field("scripts", &scripts)?;
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

        let mut game_scripts = GameScripts {
            scripts: vec![],
            scripts_to_add: vec![],
        };

        for item in scripts {
            let js_config: JsValue = JSON::parse(&item.config).unwrap();

            js_log(&format!(
                "Deserializing script {:?} with config {:?}",
                item.name, js_config
            ));

            let mut game_script = GameScripts::build_script_from_registry(item.name);
            game_script.set_config(js_config);
            game_scripts.add_script(game_script);
        }

        Ok(game_scripts)
    }
}

impl GameScripts {
    fn build_script_from_registry(script_name: String) -> Box<dyn GameScript> {
        if let Some(builder) = SCRIPT_REGISTRY.lock().unwrap().get(&script_name) {
            return builder();
        }

        WASM_SCRIPT_REGISTERY.with(|reg| {
            let map = reg.borrow();
            if let Some(builder) = map.get(&script_name) {
                return (builder)();
            }
            panic!("Script {:?} not found in registry", script_name);
        })
    }

    pub fn schedule_script_for_mount(&mut self, script: Box<dyn GameScript>) {
        self.scripts_to_add.push(script);
    }

    pub fn add_all_scheduled_scripts(
        &mut self,
        world: &World,
        entities: &Entities,
        chunk_fetcher: &mut ChunkFetcher,
    ) {
        let scripts = std::mem::take(&mut self.scripts_to_add);
        for script in scripts {
            let script_name = script.get_name();
            self.add_script(script);
            let script = self.get_script_by_name_mut(script_name).unwrap();
            script.on_script_mounted(world, entities, chunk_fetcher);
        }
    }

    fn add_script(&mut self, script: Box<dyn GameScript>) {
        js_log(&format!("Adding script {}", script.get_name()));
        let name = script.get_name();
        if let Some(idx) = self.scripts.iter().position(|s| s.get_name() == name) {
            js_log("Replacing exisiting");
            let _ = std::mem::replace(&mut self.scripts[idx], script);
        } else {
            js_log("Inserting new");
            self.scripts.push(script);
        }
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

    pub fn ensure_script(&mut self, script_name: String) -> () {
        js_log(&format!("Ensuring Script: {}", script_name));
        let existing = self.get_script_by_name(script_name.clone());
        if existing.is_some() {
            return ();
        }
        let game_script = GameScripts::build_script_from_registry(script_name);

        self.schedule_script_for_mount(game_script);
    }

    pub fn get_script_state(&self, script_name: String) -> JsValue {
        let script = self
            .get_script_by_name(script_name.clone())
            .expect(&format!("Can't find script {:?}", script_name));

        script.get_state_wasm()
    }

    pub fn set_script_state(&mut self, script_name: String, state: JsValue) {
        let script = self
            .get_script_by_name_mut(script_name.clone())
            .expect(&format!("Can't find script {:?}", script_name));

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

    pub fn to_js(&self) -> Result<JsValue, serde_wasm_bindgen::Error> {
        serde_wasm_bindgen::to_value(self)
    }
}

#[wasm_bindgen]
impl GameScripts {
    #[wasm_bindgen(js_name = "fromJs")]
    pub fn from_js(value: JsValue) -> Result<GameScripts, serde_wasm_bindgen::Error> {
        let entity_holder: GameScripts = serde_wasm_bindgen::from_value(value)?;
        Ok(entity_holder)
    }
}

#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(js_name = "ensureScript")]
    pub fn ensure_script(&mut self, script_name: String) {
        self.scripts.ensure_script(script_name);
    }

    #[wasm_bindgen(js_name = "getScriptsJs")]
    pub fn get_scripts_js(&self) -> Result<JsValue, serde_wasm_bindgen::Error> {
        self.scripts.to_js()
    }

    #[wasm_bindgen(js_name = "getScriptState")]
    pub fn get_script_state(&self, script_name: String) -> JsValue {
        self.scripts.get_script_state(script_name)
    }

    #[wasm_bindgen(js_name = "setScriptState")]
    pub fn set_script_state(&mut self, script_name: String, state: JsValue) {
        self.scripts.set_script_state(script_name, state);
    }

    #[wasm_bindgen(js_name = "getScriptConfig")]
    pub fn get_script_config(&self, script_name: String) -> JsValue {
        self.scripts.get_script_config(script_name)
    }

    #[wasm_bindgen(js_name = "getScriptNames")]
    pub fn get_all_script_names(&self) -> Vec<String> {
        self.scripts.get_all_script_names()
    }

    #[wasm_bindgen(js_name = "setScriptConfig")]
    pub fn set_script_config(&mut self, script_name: String, val: JsValue) {
        self.scripts.set_script_config(script_name, val);
    }
}

#[wasm_bindgen]
#[derive(Debug)]
pub struct WasmGameScript {
    name: String,
    context: JsValue,
    get_config_jsfn: js_sys::Function,
    set_config_jsfn: js_sys::Function,
    on_script_mounted_jsfn: js_sys::Function,
    on_chunk_update_jsfn: js_sys::Function,
    on_entity_update_jsfn: js_sys::Function,
}

#[wasm_bindgen]
impl WasmGameScript {
    pub fn get_name_from_class(js_class: &JsValue) -> String {
        js_sys::Reflect::get(&js_class, &JsValue::from("name"))
            .expect("Class should have a static name property")
            .as_string()
            .expect("Name should be a string")
    }

    #[wasm_bindgen(constructor)]
    pub fn make_from_class(js_class: &JsValue) -> WasmGameScript {
        use js_sys::Reflect::{construct, get};
        use js_sys::{Array, Function};

        let name = WasmGameScript::get_name_from_class(js_class);

        let factory: Function = js_class
            .clone()
            .dyn_into()
            .expect("argument must be a class/constructor Function");

        let args = Array::new();

        let js_class_instance = construct(&factory, &args).expect("constructing script failed");

        js_log(&format!(
            "Making wasm game script from value {:?}",
            js_class_instance
        ));

        let on_script_mounted_jsfn = get(&js_class_instance, &JsValue::from("onScriptMounted"))
            .expect("Can't find method onScriptMounted");
        let on_chunk_update_jsfn = get(&js_class_instance, &JsValue::from("onChunkUpdate"))
            .expect("Can't find method onChunkUpdate");
        let on_entity_update_jsfn = get(&js_class_instance, &JsValue::from("onEntityUpdate"))
            .expect("can't find onEntityUpdate");
        let get_config_jsfn =
            get(&js_class_instance, &JsValue::from("getConfig")).expect("can't find getConfig");
        let set_config_jsfn =
            get(&js_class_instance, &JsValue::from("setConfig")).expect("can't find setConfig");

        WasmGameScript {
            name,
            on_script_mounted_jsfn: on_script_mounted_jsfn.into(),
            on_chunk_update_jsfn: on_chunk_update_jsfn.into(),
            on_entity_update_jsfn: on_entity_update_jsfn.into(),
            get_config_jsfn: get_config_jsfn.into(),
            set_config_jsfn: set_config_jsfn.into(),
            context: js_class_instance,
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

    fn on_script_mounted(
        &mut self,
        world: &World,
        entities: &Entities,
        _chunk_fetcher: &mut ChunkFetcher,
    ) {
        // For JavaScript scripts, we pass the IDs since they can access
        // the full Game object to get World/Entities data as needed
        let all_chunk_ids = world.get_all_chunk_ids();
        let all_entity_ids = entities.get_all_entity_ids();
        let val = serde_wasm_bindgen::to_value(&all_chunk_ids).unwrap();
        let val2 = serde_wasm_bindgen::to_value(&all_entity_ids).unwrap();
        self.on_script_mounted_jsfn
            .call2(&self.context, &val, &val2)
            .unwrap();
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

type WasmScriptDeserializer = Box<dyn Fn() -> Box<dyn GameScript>>;

#[wasm_bindgen]
pub fn add_script_to_registry(game_script_class: JsValue) {
    js_log(&format!(
        "Adding WASM script to registry{:?}",
        game_script_class
    ));
    let name = WasmGameScript::get_name_from_class(&game_script_class);

    let des: WasmScriptDeserializer = Box::new(move || -> Box<dyn GameScript> {
        let js_game_script = WasmGameScript::make_from_class(&game_script_class);
        Box::new(js_game_script)
    });

    WASM_SCRIPT_REGISTERY.with(|reg| {
        reg.borrow_mut().insert(name.clone(), des);
    });
}
