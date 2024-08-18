use crate::vec::Vec3;

pub type Velocity = Vec3<f32>;

impl Velocity {
    pub fn zero() -> Velocity {
        Velocity {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        }
    }
}

