use serde::{Deserialize, Serialize};
use std::{any::Any, fmt::Debug};

#[typetag::serde(tag = "type")]
pub trait Component: Any + Debug {
    fn as_any(&self) -> &dyn Any;
    fn as_any_mut(&mut self) -> &mut dyn Any;
}

macro_rules! impl_component {
    ($type:ty) => {
        #[typetag::serde]
        impl $crate::entities::entity_component::Component for $type {
            fn as_any(&self) -> &dyn std::any::Any {
                self
            }
            fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
                self
            }
        }
    };
}
pub(crate) use impl_component;
