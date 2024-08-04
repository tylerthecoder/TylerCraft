use std::any::Any;

use crate::world::World;

pub type EntityId = u32;

pub trait Entity: Any {
    fn update(&mut self, world: &World) -> ();
    fn id(&self) -> u32;
}

pub trait EntityAction: Any {
    fn name(&self) -> &'static str;
    fn entityid(&self) -> EntityId;
    fn data(&self) -> Box<dyn Any>;
}
