use std::borrow::BorrowMut;

use crate::{positions::FineWorldPos, vec::Cartesian3DRotation};

pub struct Camera {
    pub pos: FineWorldPos,
    /**
     * The direction the camera is rotated.
     * i.e. which way it is pointing.
     */
    pub rot: Cartesian3DRotation,
}

impl Camera {
    pub fn move_forward(&mut self, amount: f32) {
        self.pos = self.rot.borrow_mut().to_unit_vector().scalar_mult(amount)
    }
}
