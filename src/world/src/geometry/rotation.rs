use crate::vec::Vec3;
use serde::{Deserialize, Serialize};
use std::f32::consts::PI;

#[derive(Clone, Copy, PartialEq, Debug, Serialize, Deserialize)]
pub struct SphericalRotation {
    /** The flat angle. [0, 2PI] */
    pub theta: f32,

    /** The up/down angle. [-PI/2, PI/2] */
    pub phi: f32,
}

impl SphericalRotation {
    pub fn new(theta: f32, phi: f32) -> SphericalRotation {
        SphericalRotation { theta, phi }
    }
}

impl Into<Vec3<f32>> for SphericalRotation {
    /**
     * Converts a spherical rotation into a unit vector.
     */
    fn into(self) -> Vec3<f32> {
        let phi_offset = (PI / 2.0) - self.phi;
        let theta_offset = self.theta + (PI / 2.0);

        Vec3 {
            x: -(theta_offset.cos() * phi_offset.sin()),
            y: -phi_offset.cos(),
            z: theta_offset.sin() * phi_offset.sin(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::direction::Direction;

    impl Vec3<f32> {
        fn assert_eq(&self, other: Vec3<f32>) {
            assert!((self.x - other.x).abs() < 0.0001);
            assert!((self.y - other.y).abs() < 0.0001);
            assert!((self.z - other.z).abs() < 0.0001);
        }
    }

    fn run_direction_test(direction: Direction, expected: Vec3<f32>) {
        let rot: SphericalRotation = direction.into();
        let unit_vector: Vec3<f32> = rot.into();
        unit_vector.assert_eq(expected);
    }

    #[test]
    fn tests_directions() {
        run_direction_test(Direction::North, Vec3::new(0.0, 0.0, 1.0));
        run_direction_test(Direction::South, Vec3::new(0.0, 0.0, -1.0));
        run_direction_test(Direction::East, Vec3::new(1.0, 0.0, 0.0));
        run_direction_test(Direction::West, Vec3::new(-1.0, 0.0, 0.0));
        run_direction_test(Direction::Up, Vec3::new(0.0, 1.0, 0.0));
        run_direction_test(Direction::Down, Vec3::new(0.0, -1.0, 0.0));
    }
}
