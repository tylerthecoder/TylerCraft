use crate::direction::DirectionVectorExtension;
use crate::direction::Directions;
use num::{integer::Roots, traits::real::Real, One, Zero};
use serde::{Deserialize, Serialize};
use std::{
    fmt::Display,
    ops::{Div, Neg, Sub},
};
use wasm_bindgen::prelude::wasm_bindgen;

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
        impl $crate::vec::Vector3Ops for $vector_type {
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

pub struct Vec3f32 {
    x: f32,
    y: f32,
    z: f32,
}

impl_vector_ops!(Vec3f32, f32);

pub struct Vec3i16 {
    pub x: i16,
    pub y: i16,
    pub z: i16,
}

impl_vector_ops!(Vec3i16, i16);

#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct Vec3u8 {
    pub x: i8,
    pub y: i8,
    pub z: i8,
}

impl_vector_ops!(Vec3u8, i8);

// #[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
// pub struct Vec2<T> {
//     pub x: T,
//     pub y: T,
// }

// impl<T, U> Sub<Vec2<U>> for Vec2<T>
// where
//     T: Sub<U, Output = T> + Copy,
// {
//     type Output = Vec2<T>;

//     fn sub(self, rhs: Vec2<U>) -> Self::Output {
//         Vec2 {
//             x: self.x - rhs.x,
//             y: self.y - rhs.y,
//         }
//     }
// }

// impl<T, U> Mul<Vec2<U>> for Vec2<T>
// where
//     T: Mul<U, Output = T> + Copy,
//     U: Copy,
// {
//     type Output = Vec2<T>;

//     fn mul(self, rhs: Vec2<U>) -> Self::Output {
//         Vec2 {
//             x: self.x * rhs.x,
//             y: self.y * rhs.y,
//         }
//     }
// }

// impl<T: Add<Output = T> + Clone + Copy + PartialOrd + Into<i64>> Vec2<T> {
//     pub fn new(x: T, y: T) -> Vec2<T> {
//         Vec2 { x, y }
//     }

//     pub fn to_index(&self) -> String
//     where
//         T: Display,
//     {
//         format!("{},{}", self.x, self.y).as_str().to_owned()
//     }

//     pub fn scalar_mul(&self, val: T) -> Vec2<T>
//     where
//         T: Mul<T, Output = T> + Copy,
//     {
//         Vec2 {
//             x: self.x * val,
//             y: self.y * val,
//         }
//     }

//     pub fn add_vec(&self, vec: Vec2<T>) -> Vec2<T>
//     where
//         T: Mul<T, Output = T> + Copy,
//     {
//         Vec2 {
//             x: self.x * vec.x,
//             y: self.y * vec.y,
//         }
//     }

//     pub fn sum(&self) -> T {
//         self.x + self.y
//     }

//     /** Returns a list of adjacent vectors that lie in a flat plane
//      * I.e no vectors that have a different y direction.
//      */
//     pub fn get_adjacent_vecs(&self) -> Vec<Vec2<T>>
//     where
//         T: Copy + Add<T, Output = T> + AddAssign<T> + One + SubAssign,
//     {
//         let mut adj_vecs: Vec<Vec2<T>> = Vec::new();
//         for direction in EVERY_FLAT_DIRECTION {
//             let adj_vec = self.move_in_flat_direction(&direction);
//             adj_vecs.push(adj_vec);
//         }
//         adj_vecs
//     }

//     // disclaimer, this is weird.
//     pub fn move_to_3d(&self, y_val: T) -> Vec3<T>
//     where
//         T: Copy,
//     {
//         Vec3 {
//             x: self.x,
//             y: y_val,
//             z: self.y,
//         }
//     }

//     pub fn distance_to<U>(&self, vec: Vec2<U>) -> f32
//     where
//         U: Sub<U, Output = T> + Copy + Mul<T, Output = T> + Add<T, Output = T>,
//         T: Sub<U, Output = T> + Copy + Mul<T, Output = T> + Add<T, Output = T>,
//         f32: From<T>,
//     {
//         let diff = *self - vec;
//         let diff_squared = diff * diff;
//         let sum = diff_squared.sum();
//         // take the sqrt of sum
//         let sum_f32: f32 = sum.into() as f32;
//         sum_f32.sqrt()
//     }

//     pub fn move_in_flat_direction(&self, direction: &FlatDirection) -> Vec2<T>
//     where
//         T: Copy + Add<T, Output = T> + AddAssign<T> + One + SubAssign,
//     {
//         let mut new_vec = *self;
//         match direction {
//             FlatDirection::North => new_vec.y += T::one(),
//             FlatDirection::South => new_vec.y -= T::one(),
//             FlatDirection::East => new_vec.x += T::one(),
//             FlatDirection::West => new_vec.x -= T::one(),
//         }
//         new_vec
//     }
// }

// #[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
// #[repr(C)]
// pub struct Vec3<T> {
//     pub x: T,
//     pub y: T,
//     pub z: T,
// }

// impl<T, U> Add<Vec3<U>> for Vec3<T>
// where
//     T: Add<U, Output = T> + Copy,
// {
//     type Output = Vec3<T>;
//     fn add(self, rhs: Vec3<U>) -> Self::Output {
//         Vec3 {
//             x: self.x + rhs.x,
//             y: self.y + rhs.y,
//             z: self.z + rhs.z,
//         }
//     }
// }

// impl<T, U> Sub<Vec3<U>> for Vec3<T>
// where
//     T: Sub<U, Output = T> + Copy,
// {
//     type Output = Vec3<T>;

//     fn sub(self, rhs: Vec3<U>) -> Self::Output {
//         Vec3 {
//             x: self.x - rhs.x,
//             y: self.y - rhs.y,
//             z: self.z - rhs.z,
//         }
//     }
// }

// impl<T, U> Mul<Vec3<U>> for Vec3<T>
// where
//     T: Mul<U, Output = T> + Copy,
//     U: Copy,
// {
//     type Output = Vec3<T>;

//     fn mul(self, rhs: Vec3<U>) -> Self::Output {
//         Vec3 {
//             x: self.x * rhs.x,
//             y: self.y * rhs.y,
//             z: self.z * rhs.z,
//         }
//     }
// }

// impl<T, U> Mul<U> for Vec3<T>
// where
//     T: Mul<U, Output = T> + Copy,
//     U: Copy + Num,
// {
//     type Output = Vec3<T>;

//     fn mul(self, val: U) -> Self::Output {
//         Vec3 {
//             x: self.x * val,
//             y: self.y * val,
//             z: self.z * val,
//         }
//     }
// }

// impl<
//         T: Add<Output = T>
//             + Sub<Output = T>
//             + Mul<T, Output = T>
//             + Display
//             + Copy
//             + AddAssign<T>
//             + One
//             + SubAssign,
//     > Vec3<T>
// {
//     pub fn new(x: T, y: T, z: T) -> Vec3<T> {
//         Vec3 { x, y, z }
//     }
// }

#[cfg(test)]
pub mod tests {
    use crate::vec::{Vec3f32, Vector3Ops};

    #[test]
    fn test_distance_to() {
        let vec1 = Vec3f32 {
            x: 0 as f32,
            y: 0 as f32,
            z: 0 as f32,
        };
        let vec2 = Vec3f32 {
            x: 1 as f32,
            y: 1 as f32,
            z: 1 as f32,
        };
        assert_eq!(vec1.distance_to(&vec2), 1.7320508);

        let vec1 = Vec3f32 {
            x: 0 as f32,
            y: 0 as f32,
            z: 0 as f32,
        };
        let vec2 = Vec3f32 {
            x: 1 as f32,
            y: 0 as f32,
            z: 0 as f32,
        };
        assert_eq!(vec1.distance_to(&vec2), 1.0);
    }
}
