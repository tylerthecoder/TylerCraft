use serde::{Serialize, Deserialize};
use wasm_bindgen::prelude::wasm_bindgen;

use crate::vec::Vec3;


#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[wasm_bindgen]
pub enum Direction {
    North = 0,
    South = 1,
    East = 2,
    West = 3,
    Up = 4,
    Down = 5,
}

pub type Directions = [bool; 6];

pub const ALL_DIRECTIONS: Directions = [true; 6];


pub fn create_directions(direction: Direction) -> Directions {
    let mut directions = [false; 6];
    directions[direction as usize] = true;
    directions
}

impl Direction {
		pub fn from_index(index: usize) -> Direction {
				match index {
						0 => Direction::North,
						1 => Direction::South,
						2 => Direction::East,
						3 => Direction::West,
						4 => Direction::Up,
						5 => Direction::Down,
						_ => panic!("Invalid direction index: {}", index),
				}
		}

		pub fn to_index(&self) -> usize {
				match self {
						Direction::North => 0,
						Direction::South => 1,
						Direction::East => 2,
						Direction::West => 3,
						Direction::Up => 4,
						Direction::Down => 5,
				}
		}

		pub fn to_directions(&self) -> Directions {
				create_directions(*self)
		}
}
