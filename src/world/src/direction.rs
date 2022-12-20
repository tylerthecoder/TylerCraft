use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::wasm_bindgen;

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

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[wasm_bindgen]
pub enum FlatDirection {
    North = 0,
    South = 1,
    East = 2,
    West = 3,
}

pub type Directions = [bool; 6];

pub const ALL_DIRECTIONS: Directions = [true; 6];

pub const EVERY_FLAT_DIRECTION: [FlatDirection; 4] = [
    FlatDirection::North,
    FlatDirection::South,
    FlatDirection::East,
    FlatDirection::West,
];

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

    pub fn iter() -> impl Iterator<Item = Direction> {
        (0..6).map(|i| Direction::from_index(i))
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

    pub fn empty() -> Directions {
        [false; 6]
    }

    pub fn to_directions(&self) -> Directions {
        create_directions(*self)
    }

    pub fn flatten(&self) -> FlatDirection {
        match self {
            Direction::North => FlatDirection::North,
            Direction::South => FlatDirection::South,
            Direction::East => FlatDirection::East,
            Direction::West => FlatDirection::West,
            Direction::Up => FlatDirection::North,
            Direction::Down => FlatDirection::South,
        }
    }
}
