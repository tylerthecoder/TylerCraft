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

    pub fn to_unit_vector(&self) -> Vec3<f32> {
        let phi_offset = (PI / 2.0) - self.phi;

        Vec3 {
            x: (self.theta.cos() * phi_offset.sin()),
            y: phi_offset.cos(),
            z: self.theta.sin() * phi_offset.sin(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f32::consts::PI;

    impl Vec3<f32> {
        fn assert_eq(&self, other: Vec3<f32>) {
            assert!((self.x - other.x).abs() < 0.0001);
            assert!((self.y - other.y).abs() < 0.0001);
            assert!((self.z - other.z).abs() < 0.0001);
        }
    }

    #[test]
    fn test_spherical_rotation_to_unit_vector() {
        let rotation = SphericalRotation {
            theta: 0.0,
            phi: 0.0,
        };
        rotation
            .to_unit_vector()
            .assert_eq(Vec3::new(1.0, 0.0, 0.0));

        let rotation = SphericalRotation {
            theta: 0.0,
            phi: PI / 2.0,
        };
        rotation
            .to_unit_vector()
            .assert_eq(Vec3::new(0.0, 1.0, 0.0));

        let rotation = SphericalRotation {
            theta: 0.0,
            phi: -PI / 2.0,
        };
        rotation
            .to_unit_vector()
            .assert_eq(Vec3::new(0.0, -1.0, 0.0));

        let rotation = SphericalRotation {
            theta: PI / 2.0,
            phi: 0.0,
        };
        rotation
            .to_unit_vector()
            .assert_eq(Vec3::new(0.0, 0.0, 1.0));

        let rotation = SphericalRotation {
            theta: -PI / 2.0,
            phi: 0.0,
        };
        rotation
            .to_unit_vector()
            .assert_eq(Vec3::new(0.0, 0.0, -1.0));
    }
}
