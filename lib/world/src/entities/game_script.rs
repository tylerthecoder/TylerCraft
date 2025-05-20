use super::entity::{EntityId, EntityQuery, EntityQueryResults};
use super::game::{GameDiff, GameSchedule};
use crate::world::World;
use std::any::Any;
use std::fmt::Debug;

pub trait GameScript: Any + Debug {
    fn update(&mut self, world: &World, query_results: EntityQueryResults) -> Option<GameSchedule> {
        None
    }

    fn get_query(&self) -> EntityQuery {
        EntityQuery::new()
    }

    fn on_diff(&self, diff: GameDiff) {
        // Default implementation does nothing
    }
}

macro_rules! impl_script {
    ($type:ty) => {
        impl Component for $type {
            fn as_any(&self) -> &dyn std::any::Any {
                self
            }
            fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
                self
            }
        }
    };
}
pub(crate) use impl_script;
use wasm_bindgen::prelude::wasm_bindgen;

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

    // pub fn get_script<T>(&self, entity_id: EntityId) -> Option<&T>
    // where
    //     T: EntityScript + Any,
    // {
    //     let ent_scripts = self.get_scripts_for_entity(entity_id);

    //     let script = ent_scripts
    //         .iter()
    //         .find_map(|script| script.as_any().downcast_ref::<T>());

    //     script
    // }

    // pub fn copy(&self) -> EntityScriptHolder {
    //     EntityScriptHolder {
    //         scripts: self
    //             .scripts
    //             .into_iter()
    //             .map(|(id, script)| (id, script.clone()))
    //             .collect(),
    //     }
    // }
}
