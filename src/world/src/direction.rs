use serde::{Deserialize, Serialize};
use std::iter::{FromIterator, IntoIterator};
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

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Directions {
    data: [bool; 6],
}

impl Directions {
    pub fn all() -> Directions {
        Directions { data: [true; 6] }
    }

    pub fn empty() -> Directions {
        Directions { data: [false; 6] }
    }

    // pub fn iter(&self) -> Vec<Direction> {
    //     (0..6)
    //         .filter_map(|i| if self.data[i] { Some(i) } else { None })
    //         .map(move |i| Direction::from_index(i))
    //         .collect()
    // }

    pub fn create_for_direction(direction: Direction) -> Directions {
        let mut data = [false; 6];
        data[direction as usize] = true;
        Directions { data }
    }

    pub fn has_direction(&self, direction: Direction) -> bool {
        self.data[direction as usize]
    }
}

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

pub const EVERY_FLAT_DIRECTION: [FlatDirection; 4] = [
    FlatDirection::North,
    FlatDirection::South,
    FlatDirection::East,
    FlatDirection::West,
];

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
}
