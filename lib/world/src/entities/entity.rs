use std::any::Any;
use serde::{Deserialize, Serialize};
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};

use crate::world::World;

pub type EntityId = u32;

pub trait Entity: Any {
    fn update(&mut self, world: &World) -> ();
    fn id(&self) -> u32;
}


#[wasm_bindgen]
pub struct EntityAction {
    pub entity_id: EntityId,
    #[wasm_bindgen(skip)]
    pub name: &'static str,
    #[wasm_bindgen(skip)]
    pub data: Box<dyn Any>,
}


pub mod wasm {
    use wasm_bindgen::prelude::*;


    // #[wasm_bindgen]
    // impl EntityAction {




    // }



}