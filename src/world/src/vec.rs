use crate::direction::{Direction};
use std::{ops::{ Add, Mul, AddAssign, SubAssign }, fmt::Display};
use num::One;
use serde::{Serialize, Deserialize};
use wasm_bindgen::prelude::wasm_bindgen;



#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct Vec2<T> {
	pub x: T,
	pub y: T,
}

impl<T> Vec2<T> {
	pub fn new(x: T, y: T) -> Vec2<T> {
		Vec2 {
			x,
			y,
		}
	}

	pub fn to_index(&self) -> String
		where T: Display
	{
		format!("{} {}", self.x, self.y).as_str().to_owned()
	}

	pub fn scalar_mul(&self, val: T) -> Vec2<T>
		where T: Mul<T, Output = T> + Copy
	{
		Vec2 {
			x: self.x * val,
			y: self.y * val,
		}
	}

	pub fn add_vec(&self, vec: Vec2<T>) -> Vec2<T>
		where T: Mul<T, Output = T> + Copy
	{
		Vec2 {
			x: self.x * vec.x,
			y: self.y * vec.y,
		}
	}


	// disclaimer, this is weird.
	pub fn move_to_3d(&self, y_val: T) -> Vec3<T>
		where T: Copy
	{
		Vec3 {
			x: self.x,
			y: y_val,
			z: self.y,
		}
	}


}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Vec3<T> {
	pub x: T,
	pub y: T,
	pub z: T,
}

impl<T> Vec3<T> {
	pub fn new(x: T, y: T, z: T) -> Vec3<T> {
		Vec3 {
			x,
			y,
			z,
		}
	}

	pub fn to_index(&self) -> String
		where T: Display
	{
		format!("{} {} {}", self.x, self.y, self.z).as_str().to_owned()
	}

	pub fn from_direction(direction: &Direction) -> Vec3<i32>{
		match direction {
			Direction::North => Vec3::new(0, 0, 1),
			Direction::South => Vec3::new(0, 0, -1),
			Direction::East => Vec3::new(1, 0, 0),
			Direction::West => Vec3::new(-1, 0, 0),
			Direction::Up => Vec3::new(0, 1, 0),
			Direction::Down => Vec3::new(0, -1, 0),
		}
	}

	pub fn move_direction(&self, direction: &Direction) -> Vec3<T>
		where T: Copy + Add<T, Output = T> + AddAssign<T> + One + SubAssign
	{
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


	pub fn scalar_mult(&self, val: T) -> Vec3<T>
		where T: Mul<T, Output = T> + Copy,
	{
		Vec3 {
			x: self.x * val,
			y: self.y * val,
			z: self.z * val
		}
	}

	pub fn add_vec<U>(&self, vec: Vec3<U>) -> Vec3<T>
		where U: Add<U, Output = T>, T: Add<U, Output = T> + Copy
	{
		Vec3 {
			x: self.x + vec.x,
			y: self.y + vec.y,
			z: self.z + vec.z
		}
	}

	pub fn map<B, F>(&self, f: F) -> Vec3<B>
		where F: Fn(T) -> B , T: Copy
	{
		Vec3 {
			x: f(self.x),
			y: f(self.y),
			z: f(self.z),
		}
	}


}