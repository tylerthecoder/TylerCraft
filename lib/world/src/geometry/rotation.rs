use crate::{
    components::{fine_world_pos::FineWorldPos, velocity::Velocity},
    entities::entity_component::impl_component,
};
use serde::{Deserialize, Serialize};
use std::{f32::consts::PI, ops::Add};
use wasm_bindgen::prelude::wasm_bindgen;

#[derive(Clone, Copy, PartialEq, Debug, Default, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct SphericalRotation {
    /** The flat angle. [0, 2PI] */
    pub theta: f32,

    /** The up/down angle. [-PI/2, PI/2] */
    pub phi: f32,
}

#[wasm_bindgen]
impl SphericalRotation {
    pub fn new_wasm(theta: f32, phi: f32) -> SphericalRotation {
        SphericalRotation { theta, phi }
    }
}

impl_component!(SphericalRotation);

impl SphericalRotation {
    pub fn new(theta: f32, phi: f32) -> SphericalRotation {
        SphericalRotation { theta, phi }
    }

    pub fn get_unit_vector(&self) -> Velocity {
        let phi_offset = (PI / 2.0) - self.phi;
        let theta_offset = self.theta + (PI / 2.0);

        Velocity::new(
            -(theta_offset.cos() * phi_offset.sin()),
            -phi_offset.cos(),
            theta_offset.sin() * phi_offset.sin(),
        )
    }

    pub fn to_fine_world_pos(&self) -> FineWorldPos {
        let phi_offset = (PI / 2.0) - self.phi;
        let theta_offset = self.theta + (PI / 2.0);

        FineWorldPos {
            x: -(theta_offset.cos() * phi_offset.sin()),
            y: -phi_offset.cos(),
            z: theta_offset.sin() * phi_offset.sin(),
        }
    }
}

impl Add for SphericalRotation {
    type Output = Self;

    fn add(self, other: Self) -> Self {
        // Add the angles
        let mut new_theta = self.theta + other.theta;
        let mut new_phi = self.phi + other.phi;

        // Ensure theta is in [0, 2PI]
        if new_theta < 0.0 {
            new_theta += 2.0 * std::f32::consts::PI;
        } else if new_theta > 2.0 * std::f32::consts::PI {
            new_theta -= 2.0 * std::f32::consts::PI;
        }

        // Ensure phi is in [-PI/2, PI/2]
        if new_phi < -std::f32::consts::FRAC_PI_2 {
            new_phi = -std::f32::consts::FRAC_PI_2;
        } else if new_phi > std::f32::consts::FRAC_PI_2 {
            new_phi = std::f32::consts::FRAC_PI_2;
        }

        Self {
            theta: new_theta,
            phi: new_phi,
        }
    }
}

impl Into<Velocity> for SphericalRotation {
    /**
     * Converts a spherical rotation into a unit vector.
     */
    fn into(self) -> Velocity {
        let phi_offset = (PI / 2.0) - self.phi;
        let theta_offset = self.theta + (PI / 2.0);

        Velocity {
            x: -(theta_offset.cos() * phi_offset.sin()),
            y: -phi_offset.cos(),
            z: theta_offset.sin() * phi_offset.sin(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::geometry::direction::Direction;

    impl Velocity {
        fn assert_eq(&self, other: Velocity) {
            assert!((self.x - other.x).abs() < 0.0001);
            assert!((self.y - other.y).abs() < 0.0001);
            assert!((self.z - other.z).abs() < 0.0001);
        }
    }

    fn run_direction_test(direction: Direction, expected: Velocity) {
        let rot: SphericalRotation = direction.into();
        let unit_vector: Velocity = rot.into();
        unit_vector.assert_eq(expected);
    }

    #[test]
    fn tests_directions() {
        run_direction_test(Direction::North, Velocity::new(0.0, 0.0, 1.0));
        run_direction_test(Direction::South, Velocity::new(0.0, 0.0, -1.0));
        run_direction_test(Direction::East, Velocity::new(1.0, 0.0, 0.0));
        run_direction_test(Direction::West, Velocity::new(-1.0, 0.0, 0.0));
        run_direction_test(Direction::Up, Velocity::new(0.0, 1.0, 0.0));
        run_direction_test(Direction::Down, Velocity::new(0.0, -1.0, 0.0));
    }
}
