use crate::geometry::rotation::SphericalRotation;
use serde::{Deserialize, Serialize};
use std::{
    f32::consts::PI,
    iter::{FromIterator, IntoIterator},
};
use wasm_bindgen::prelude::wasm_bindgen;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[wasm_bindgen]
pub enum Direction {
    North = 0,
    South = 1,
    Up = 2,
    Down = 3,
    East = 4,
    West = 5,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[wasm_bindgen]
pub enum FlatDirection {
    North = 0,
    South = 1,
    East = 2,
    West = 3,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Directions {
    data: [bool; 6],
}

pub const EVERY_FLAT_DIRECTION: [FlatDirection; 4] = [
    FlatDirection::North,
    FlatDirection::South,
    FlatDirection::East,
    FlatDirection::West,
];

pub const EVERY_DIRECTION: [Direction; 6] = [
    Direction::North,
    Direction::South,
    Direction::Up,
    Direction::Down,
    Direction::East,
    Direction::West,
];

impl FromIterator<Direction> for Directions {
    fn from_iter<I: IntoIterator<Item = Direction>>(iter: I) -> Self {
        let mut data = [false; 6];
        for direction in iter {
            data[direction as usize] = true;
        }
        Directions { data }
    }
}

impl IntoIterator for Directions {
    type Item = Direction;
    type IntoIter = std::vec::IntoIter<Self::Item>;
    fn into_iter(self) -> Self::IntoIter {
        (0..6)
            .filter_map(|i| if self.data[i] { Some(i) } else { None })
            .map(move |i| Direction::from_index(i))
            .collect::<Vec<Direction>>()
            .into_iter()
    }
}

impl Directions {
    pub fn all() -> Directions {
        Directions { data: [true; 6] }
    }

    pub fn empty() -> Directions {
        Directions { data: [false; 6] }
    }

    pub fn remove_direction(&mut self, direction: Direction) {
        self.data[direction as usize] = false;
    }

    pub fn create_for_direction(direction: Direction) -> Directions {
        let mut data = [false; 6];
        data[direction as usize] = true;
        Directions { data }
    }

    pub fn has_direction(&self, direction: Direction) -> bool {
        self.data[direction as usize]
    }
}

impl Direction {
    pub fn from_index(index: usize) -> Direction {
        match index {
            0 => Direction::North,
            1 => Direction::South,
            2 => Direction::Up,
            3 => Direction::Down,
            4 => Direction::East,
            5 => Direction::West,
            _ => panic!("Invalid direction index: {}", index),
        }
    }

    pub fn to_index(&self) -> usize {
        match self {
            Direction::North => 0,
            Direction::South => 1,
            Direction::Up => 2,
            Direction::Down => 3,
            Direction::East => 4,
            Direction::West => 5,
        }
    }

    pub fn to_directions(&self) -> Directions {
        Directions::create_for_direction(*self)
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

    pub fn is_outward(&self) -> bool {
        match self {
            Direction::North => true,
            Direction::South => false,
            Direction::East => true,
            Direction::West => false,
            Direction::Up => true,
            Direction::Down => false,
        }
    }
}

// Conversions

impl Into<SphericalRotation> for Direction {
    fn into(self) -> SphericalRotation {
        match self {
            Direction::North => SphericalRotation::new(0.0, 0.0),
            Direction::South => SphericalRotation::new(PI, 0.0),
            Direction::East => SphericalRotation::new(PI / 2.0, 0.0),
            Direction::West => SphericalRotation::new(3.0 * PI / 2.0, 0.0),
            Direction::Up => SphericalRotation::new(0.0, -PI / 2.0),
            Direction::Down => SphericalRotation::new(0.0, PI / 2.0),
        }
    }
}
