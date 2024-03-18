use crate::direction::{Direction, Directions, FlatDirection, EVERY_FLAT_DIRECTION};
use num::{traits::real::Real, One, Zero};
use serde::{Deserialize, Serialize};
use std::{
    fmt::Display,
    ops::{Add, AddAssign, Mul, Neg, Sub, SubAssign},
};

#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct Vec2<T> {
    pub x: T,
    pub y: T,
}


impl<T> Vec2<T> {
    pub fn new(x: T, y: T) -> Vec2<T> {
        Vec2 { x, y }
    }

    pub fn to_index(&self) -> String
    where
        T: Display,
    {
        format!("{},{}", self.x, self.y).as_str().to_owned()
    }

    pub fn scalar_mul(&self, val: T) -> Vec2<T>
    where
        T: Mul<T, Output = T> + Copy,
    {
        Vec2 {
            x: self.x * val,
            y: self.y * val,
        }
    }

    pub fn add_vec(&self, vec: Vec2<T>) -> Vec2<T>
    where
        T: Mul<T, Output = T> + Copy,
    {
        Vec2 {
            x: self.x * vec.x,
            y: self.y * vec.y,
        }
    }

    /** Returns a list of adjacent vectors that lie in a flat plane
     * I.e no vectors that have a different y direction.
     */
    pub fn get_adjacent_vecs(&self) -> Vec<Vec2<T>>
    where
        T: Copy + Add<T, Output = T> + AddAssign<T> + One + SubAssign,
    {
        let mut adj_vecs: Vec<Vec2<T>> = Vec::new();
        for direction in EVERY_FLAT_DIRECTION {
            let adj_vec = self.move_in_flat_direction(&direction);
            adj_vecs.push(adj_vec);
        }
        adj_vecs
    }

    // disclaimer, this is weird.
    pub fn move_to_3d(&self, y_val: T) -> Vec3<T>
    where
        T: Copy,
    {
        Vec3 {
            x: self.x,
            y: y_val,
            z: self.y,
        }
    }

    pub fn move_in_flat_direction(&self, direction: &FlatDirection) -> Vec2<T>
    where
        T: Copy + Add<T, Output = T> + AddAssign<T> + One + SubAssign,
    {
        let mut new_vec = *self;
        match direction {
            FlatDirection::North => new_vec.y += T::one(),
            FlatDirection::South => new_vec.y -= T::one(),
            FlatDirection::East => new_vec.x += T::one(),
            FlatDirection::West => new_vec.x -= T::one(),
        }
        new_vec
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Vec3<T> {
    pub x: T,
    pub y: T,
    pub z: T,
}

impl<T> IntoIterator for Vec3<T> {
    type Item = T;
    type IntoIter = std::vec::IntoIter<T>;

    fn into_iter(self) -> Self::IntoIter {
        vec![self.x, self.y, self.z].into_iter()
    }
}


impl<T, U> Sub<Vec3<U>> for Vec3<T>
where
    T: Sub<U, Output = T> + Copy,
{
    type Output = Vec3<T>;

    fn sub(self, rhs: Vec3<U>) -> Self::Output {
        Vec3 {
            x: self.x - rhs.x,
            y: self.y - rhs.y,
            z: self.z - rhs.z,
        }
    }
}

impl<T, U> Mul<Vec3<U>> for Vec3<T>
where
    T: Mul<U, Output = T> + Copy,
{
    type Output = Vec3<T>;

    fn mul(self, rhs: Vec3<U>) -> Self::Output {
        Vec3 {
            x: self.x * rhs.x,
            y: self.y * rhs.y,
            z: self.z * rhs.z,
        }
    }
}

impl<
        T: Add<Output = T>
            + Sub<Output = T>
            + Mul<T, Output = T>
            + Display
            + Copy
            + AddAssign<T>
            + One
            + SubAssign,
    > Vec3<T>
{
    pub fn new(x: T, y: T, z: T) -> Vec3<T> {
        Vec3 { x, y, z }
    }

    pub fn get_component_from_direction(&self, direction: Direction) -> T {
        match direction {
            Direction::North => self.z,
            Direction::South => self.z,
            Direction::East => self.x,
            Direction::West => self.x,
            Direction::Up => self.y,
            Direction::Down => self.y,
        }
    }

    pub fn get_opposite_components_from_direction(&self, direction: Direction) -> (T, T) {
        match direction {
            Direction::North => (self.x, self.y),
            Direction::South => (self.x, self.y),
            Direction::East => (self.y, self.z),
            Direction::West => (self.y, self.z),
            Direction::Up => (self.x, self.z),
            Direction::Down => (self.x, self.z),
        }
    }

    pub fn to_index(&self) -> String {
        format!("{},{},{}", self.x, self.y, self.z)
            .as_str()
            .to_owned()
    }

    pub fn move_direction(&self, direction: &Direction) -> Vec3<T> {
        let mut new_vec = self.clone();
        match direction {
            Direction::North => new_vec.z += One::one(),
            Direction::South => new_vec.z -= One::one(),
            Direction::East => new_vec.x += One::one(),
            Direction::West => new_vec.x -= One::one(),
            Direction::Up => new_vec.y += One::one(),
            Direction::Down => new_vec.y -= One::one(),
        }
        new_vec
    }

    pub fn sum(&self) -> T {
        self.x + self.y + self.z
    }

    pub fn scalar_mult(&self, val: T) -> Vec3<T> {
        Vec3 {
            x: self.x * val,
            y: self.y * val,
            z: self.z * val,
        }
    }

    pub fn add_vec<U>(&self, vec: Vec3<U>) -> Vec3<T>
    where
        U: Add<U, Output = T>,
        T: Add<U, Output = T> + Copy,
    {
        Vec3 {
            x: self.x + vec.x,
            y: self.y + vec.y,
            z: self.z + vec.z,
        }
    }

    pub fn distance_to<U>(&self, vec: Vec3<U>) -> f32
    where
        U: Sub<U, Output = T> + Copy + Mul<T, Output = T> + Add<T, Output = T>,
        T: Sub<U, Output = T> + Copy + Mul<T, Output = T> + Add<T, Output = T>,
        f32: From<T>,
    {
        let diff = *self - vec;
        let diff_squared = diff * diff;
        let sum = diff_squared.sum();
        // take the sqrt of sum
        let sum_f32: f32 = sum.into();
        sum_f32.sqrt()
    }

    pub fn distance_to_2<U, V>(&self, vec: &Vec3<U>) -> V
    where
        U: Sub<U, Output = T> + Copy + Mul<T, Output = T> + Add<T, Output = T>,
        T: Sub<U, Output = T> + Copy + Mul<T, Output = T> + Add<T, Output = T>,
        V: From<T> + Real,
    {
        let diff = *self - *vec;
        let diff_squared = diff * diff;
        let sum = diff_squared.sum();
        let sum_f32: V = sum.into();
        sum_f32.sqrt()
    }

    pub fn map<B, F>(&self, f: F) -> Vec3<B>
    where
        F: Fn(T) -> B,
    {
        Vec3 {
            x: f(self.x),
            y: f(self.y),
            z: f(self.z),
        }
    }

    pub fn get_adjacent_vecs(&self) -> Vec<Vec3<T>> {
        let mut vecs = Vec::new();
        for direction in Directions::all() {
            vecs.push(self.move_direction(&direction));
        }
        vecs
    }

    /**
     * Like get_adjacent_vecs, but also returns the original vector
     */
    pub fn get_cross_vecs(&self) -> Vec<Vec3<T>> {
        let mut vecs = Vec::new();
        vecs.push(self.clone());
        for direction in Directions::all() {
            vecs.push(self.move_direction(&direction));
        }
        vecs
    }

    /**
     * Returns all blocks in a cube around the vector
     * I am not proud of this
     */
    pub fn get_cube_vecs(&self) -> Vec<Vec3<T>>
    where
        T: Add<Output = T> + Sub<Output = T> + Copy + One + Neg<Output = T> + Zero,
    {
        let mut vecs = Vec::new();

        vecs.push(self.clone());

        for x in [-T::one(), T::one(), T::zero()].iter().cloned() {
            for y in [-T::one(), T::one(), T::zero()].iter().cloned() {
                for z in [-T::one(), T::one(), T::zero()].iter().cloned() {
                    vecs.push(Vec3::new(self.x + x, self.y + y, self.z + z));
                }
            }
        }

        vecs
    }
}

#[cfg(test)]
pub mod tests {
    use crate::vec::Vec3;

    // #[test]
    // fn test_distance_to() {
    //     let vec1 = Vec3::new(0 as i16, 0 as i16, 0 as i16);
    //     let vec2 = Vec3::new(1, 1, 1);
    //     assert_eq!(vec1.distance_to(vec2), 1.7320508);

    //     let vec1 = Vec3::new(0 as i16, 0 as i16, 0 as i16);
    //     let vec2 = Vec3::new(1, 0, 0);
    //     assert_eq!(vec1.distance_to(vec2), 1.0);
    // }
}
