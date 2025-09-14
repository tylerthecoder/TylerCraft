use crate::geometry::vec::AsF32;
use num::{integer::Roots, traits::real::Real, One, Zero};
use std::{
    fmt::Display,
    ops::{Add, Div, Mul, Neg, Sub},
};

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
