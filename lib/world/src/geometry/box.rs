pub type RectSize = Vec3<i8>;
pub type Velocity = Vec3<f32>;

pub struct MovingBox {
    pub pos: FineWorldPos,
    pub size: RectSize,
    pub velocity: Velocity,
}
