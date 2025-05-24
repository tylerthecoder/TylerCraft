use crate::vec::{AsF32, Vec3i16};
use num::{integer::Roots, traits::real::Real, Num, One, Zero};
use serde::{Deserialize, Serialize};
use std::{
    fmt::Display,
    ops::{Add, AddAssign, Div, Mul, Neg, Sub, SubAssign},
};
use wasm_bindgen::prelude::wasm_bindgen;

pub trait Vec2Ops: Sized {
    type Scalar: Copy
        + Add<Output = Self::Scalar>
        + Sub<Output = Self::Scalar>
        + Mul<Output = Self::Scalar>
        + Div<Output = Self::Scalar>
        + Neg<Output = Self::Scalar>
        + Zero
        + One
        + AsF32
        + Display;

    fn new(x: Self::Scalar, y: Self::Scalar) -> Self;

    fn x(&self) -> Self::Scalar;
    fn y(&self) -> Self::Scalar;

    fn set_x(&mut self, val: Self::Scalar);
    fn set_y(&mut self, val: Self::Scalar);

    fn copy(&self) -> Self {
        Self::new(self.x(), self.y())
    }

    fn add(&self, other: Self) -> Self {
        return Self::new(self.x() + other.x(), self.y() + other.y());
    }

    fn sub(&self, other: &Self) -> Self {
        return Self::new(self.x() - other.x(), self.y() - other.y());
    }

    fn scalar_mul(&self, other: Self::Scalar) -> Self {
        return Self::new(self.x() * other, self.y() * other);
    }

    fn mul(&self, other: Self::Scalar) -> Self {
        return Self::new(self.x() * other, self.y() * other);
    }

    fn div(&self, other: Self::Scalar) -> Self {
        return Self::new(self.x() / other, self.y() / other);
    }

    fn sqr(&self) -> Self {
        return Self::new(self.x() * self.x(), self.y() * self.y());
    }

    fn sum(&self) -> Self::Scalar {
        return self.x() + self.y();
    }

    fn distance_to(&self, other: &Self) -> f32 {
        return self.sub(other).sqr().sum().as_f32().sqrt();
    }

    fn move_to_3d(&self, y_val: Self::Scalar) -> Self {
        return Self::new(self.x(), y_val);
    }
}

macro_rules! impl_vec2_ops {
    ($vector_type:ident, $scalar_type:ty) => {
        impl $crate::geometry::vec2::Vec2Ops for $vector_type {
            type Scalar = $scalar_type;

            fn new(x: Self::Scalar, y: Self::Scalar) -> Self {
                Self { x, y }
            }

            fn x(&self) -> Self::Scalar {
                self.x
            }
            fn y(&self) -> Self::Scalar {
                self.y
            }
            fn set_x(&mut self, val: Self::Scalar) {
                self.x = val
            }
            fn set_y(&mut self, val: Self::Scalar) {
                self.y = val
            }
        }
    };
}
pub(crate) use impl_vec2_ops;

pub struct Vec2f32 {
    x: f32,
    y: f32,
}

impl_vec2_ops!(Vec2f32, f32);

#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct Vec2i16 {
    pub x: i16,
    pub y: i16,
}

#[wasm_bindgen]
impl Vec2i16 {
    #[wasm_bindgen(constructor)]
    pub fn new_wasm(x: i16, y: i16) -> Self {
        Vec2i16 { x, y }
    }
}

impl_vec2_ops!(Vec2i16, i16);

impl Vec2i16 {
    pub fn new(x: i16, y: i16) -> Self {
        Vec2i16 { x, y }
    }

    pub fn add(&self, vec: Vec2i16) -> Self {
        Vec2i16 {
            x: self.x + vec.x,
            y: self.y + vec.y,
        }
    }

    pub fn scalar_mul(&self, val: i16) -> Self {
        Vec2i16 {
            x: self.x * val,
            y: self.y * val,
        }
    }

    pub fn move_to_3d(&self, y_val: i16) -> Vec3i16 {
        Vec3i16 {
            x: self.x,
            y: y_val,
            z: self.y,
        }
    }

    pub fn get_adjacent_vecs(&self) -> Vec<Self> {
        let mut vecs = Vec::new();
        vecs.push(self.clone());
        vecs.push(self.add(Vec2i16 { x: 0, y: 1 }));
        vecs.push(self.add(Vec2i16 { x: 1, y: 0 }));
        vecs.push(self.add(Vec2i16 { x: -1, y: 0 }));
        vecs.push(self.add(Vec2i16 { x: 0, y: -1 }));
        vecs
    }
}
