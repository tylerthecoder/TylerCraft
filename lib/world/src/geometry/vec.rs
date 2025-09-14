use crate::geometry::direction::{DirectionVectorExtension, Directions};
use num::{integer::Roots, traits::real::Real, One, Zero};
use std::{
    fmt::Display,
    ops::{Div, Neg, Sub},
};

pub trait AsF32 {
    fn as_f32(self) -> f32;
}

// Note: this might cut off the precision of bigger numbers
impl AsF32 for i32 {
    fn as_f32(self) -> f32 {
        self as f32
    }
}

impl AsF32 for f32 {
    fn as_f32(self) -> f32 {
        self
    }
}

impl AsF32 for i16 {
    fn as_f32(self) -> f32 {
        self as f32
    }
}

impl AsF32 for u8 {
    fn as_f32(self) -> f32 {
        self as f32
    }
}

impl AsF32 for i8 {
    fn as_f32(self) -> f32 {
        self as f32
    }
}

pub trait Vector3Ops: Sized {
    type Scalar: Copy
        + std::ops::Add<Output = Self::Scalar>
        + std::ops::Sub<Output = Self::Scalar>
        + std::ops::Mul<Output = Self::Scalar>
        + std::ops::Div<Output = Self::Scalar>
        + Display
        + One
        + Neg<Output = Self::Scalar>
        + Zero
        + AsF32
        + Copy;

    fn new(x: Self::Scalar, y: Self::Scalar, z: Self::Scalar) -> Self;
    fn x(&self) -> Self::Scalar;
    fn y(&self) -> Self::Scalar;
    fn z(&self) -> Self::Scalar;

    fn set_x(&mut self, val: Self::Scalar);
    fn set_y(&mut self, val: Self::Scalar);
    fn set_z(&mut self, val: Self::Scalar);

    fn copy(&self) -> Self {
        Self::new(self.x(), self.y(), self.z())
    }

    fn add<V>(&self, other: &V) -> Self
    where
        V: Vector3Ops,
        V::Scalar: Into<Self::Scalar>,
        Self::Scalar: std::ops::Add<Output = Self::Scalar>,
    {
        Self::new(
            self.x() + other.x().into(),
            self.y() + other.y().into(),
            self.z() + other.z().into(),
        )
    }

    fn sub<V: Vector3Ops<Scalar = Self::Scalar>>(&self, other: &V) -> Self {
        Self::new(
            self.x() - other.x(),
            self.y() - other.y(),
            self.z() - other.z(),
        )
    }

    fn scalar_mult(&self, val: Self::Scalar) -> Self {
        Self::new(self.x() * val, self.y() * val, self.z() * val)
    }

    fn sqr(&self) -> Self {
        Self::new(
            self.x() * self.x(),
            self.y() * self.y(),
            self.z() * self.z(),
        )
    }

    fn dot<V: Vector3Ops<Scalar = Self::Scalar>>(&self, other: &V) -> Self::Scalar {
        self.x() * other.x() + self.y() * other.y() + self.z() * other.z()
    }

    fn magnitude_squared(&self) -> Self::Scalar {
        self.x() * self.x() + self.y() * self.y() + self.z() * self.z()
    }

    fn get_mag(&self) -> f32 {
        let x = self.x().as_f32();
        let y = self.y().as_f32();
        let z = self.z().as_f32();

        (x * x + y * y + z * z).sqrt()
    }

    fn sum(&self) -> Self::Scalar {
        self.x() + self.y() + self.z()
    }

    fn set_mag(&self, mag: Self::Scalar) -> Self
    where
        Self::Scalar: Into<f32> + From<f32> + Div<f32, Output = Self::Scalar>,
    {
        let current_mag = self.get_mag();
        let scale: Self::Scalar = mag / current_mag;
        self.scalar_mult(scale)
    }

    fn distance_to<U>(&self, vec: &U) -> f32
    where
        U: Vector3Ops<Scalar = Self::Scalar>,
    {
        self.sub(vec).sqr().sum().as_f32().sqrt()
    }

    fn map<B, F>(&self, f: F) -> Self
    where
        F: Fn(Self::Scalar) -> Self::Scalar,
    {
        Self::new(f(self.x()), f(self.y()), f(self.z()))
    }

    fn get_adjacent_vecs(&self) -> Vec<Self> {
        let mut vecs = Vec::new();
        for direction in Directions::all() {
            vecs.push(self.move_direction(&direction));
        }
        vecs
    }

    /**
     * Like get_adjacent_vecs, but also returns the original vector
     */
    fn get_cross_vecs(&self) -> Vec<Self> {
        let mut vecs: Vec<Self> = Vec::new();
        vecs.push(self.copy());
        for direction in Directions::all() {
            vecs.push(self.move_direction(&direction));
        }
        vecs
    }

    /**
     * Returns all blocks in a cube around the vector
     * I am not proud of this
     */
    fn get_cube_vecs(&self) -> Vec<Self> {
        let mut vecs: Vec<Self> = Vec::new();
        vecs.push(self.copy());
        let one = Self::Scalar::one();
        let zero = Self::Scalar::zero();
        for x in [-one, one, zero].iter().cloned() {
            for y in [-one, one, zero].iter().cloned() {
                for z in [-one, one, zero].iter().cloned() {
                    vecs.push(Self::new(self.x() + x, self.y() + y, self.z() + z));
                }
            }
        }

        vecs
    }

    fn to_index(&self) -> String {
        format!("{},{},{}", self.x(), self.y(), self.z())
            .as_str()
            .to_owned()
    }
}

// Macro to implement common operations
macro_rules! impl_vector_ops {
    ($vector_type:ident, $scalar_type:ty) => {
        impl $crate::geometry::vec::Vector3Ops for $vector_type {
            type Scalar = $scalar_type;

            fn new(x: Self::Scalar, y: Self::Scalar, z: Self::Scalar) -> Self {
                Self { x, y, z }
            }

            fn x(&self) -> Self::Scalar {
                self.x
            }
            fn y(&self) -> Self::Scalar {
                self.y
            }
            fn z(&self) -> Self::Scalar {
                self.z
            }

            fn set_x(&mut self, val: Self::Scalar) {
                self.x = val
            }
            fn set_y(&mut self, val: Self::Scalar) {
                self.y = val
            }
            fn set_z(&mut self, val: Self::Scalar) {
                self.z = val
            }
        }
    };
}
pub(crate) use impl_vector_ops;
