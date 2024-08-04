use crate::{
    chunk::CHUNK_WIDTH,
    vec::{Vec2, Vec3},
};

#[cfg(test)]
mod unit_tests;

pub type InnerChunkPos = Vec3<u8>;
pub type WorldPos = Vec3<i32>;
pub type ChunkPos = Vec2<i16>;
pub type FineWorldPos = Vec3<f32>;

impl InnerChunkPos {
    pub fn to_chunk_index(&self) -> usize {
        let x_part = (self.x as usize) << (4 + 6);
        let y_part = (self.y as usize) << 4;
        let z_part = self.z as usize;
        x_part + y_part + z_part
    }

    pub fn make_from_chunk_index(index: usize) -> InnerChunkPos {
        let x_part = (index >> (4 + 6)) as u8;
        let y_part = ((index & 0b1111110000) >> 4) as u8;
        let z_part = (index & 0b1111) as u8;
        InnerChunkPos::new(x_part, y_part, z_part)
    }

    pub fn to_world_pos(&self, chunk_pos: &ChunkPos) -> WorldPos {
        chunk_pos
            .scalar_mul(CHUNK_WIDTH)
            .move_to_3d(0)
            .add_vec(self.map(|x| x as i16))
            .map(|x| x as i32)
    }
}

impl WorldPos {
    pub fn is_valid(&self) -> bool {
        self.y >= 0 && self.y < 256
    }

    pub fn to_inner_chunk_pos(&self) -> InnerChunkPos {
        let x = (((self.x as i8 % 16) + 16) % 16) as u8;
        let y = self.y as u8;
        let z = (((self.z as i8 % 16) + 16) % 16) as u8;
        InnerChunkPos::new(x, y, z)
    }

    pub fn to_chunk_pos(&self) -> ChunkPos {
        let x = if self.x < 0 {
            ((self.x + 1) / CHUNK_WIDTH as i32) - 1
        } else {
            self.x / CHUNK_WIDTH as i32
        };

        let y = if self.z < 0 {
            ((self.z + 1) / CHUNK_WIDTH as i32) - 1
        } else {
            self.z / CHUNK_WIDTH as i32
        };

        ChunkPos {
            x: x as i16,
            y: y as i16,
        }
    }
}

impl ChunkPos {
    pub fn to_world_index(&self) -> i32 {
        let x = self.x as i32;
        let y = self.y as i32;
        x + (y << 16)
    }

    pub fn to_id(&self) -> u64 {
        let mut x: u64 = 2 * (self.x.abs() as u64);
        let mut y: u64 = 2 * (self.y.abs() as u64);
        if self.x < 0 {
            x += 1
        }
        if self.y < 0 {
            y += 1
        }
        let id = ((x + y) * (x + y + 1) / 2) + y;

        id
    }
}

impl std::ops::Add<ChunkPos> for ChunkPos {
    type Output = ChunkPos;
    fn add(self, other: ChunkPos) -> ChunkPos {
        ChunkPos {
            x: self.x + other.x,
            y: self.y + other.y,
        }
    }
}

impl FineWorldPos {
    pub fn to_world_pos(&self) -> WorldPos {
        WorldPos {
            x: self.x as i32,
            y: self.y as i32,
            z: self.z as i32,
        }
    }

    pub fn round(&mut self) {
        const PRECISION: f32 = 0.001; // Precision to three decimal places
        self.x = (self.x / PRECISION).round() * PRECISION;
        self.y = (self.y / PRECISION).round() * PRECISION;
        self.z = (self.z / PRECISION).round() * PRECISION;
    }

    pub fn equal(&self, other: &FineWorldPos) -> bool {
        const PRECISION: f32 = 0.001; // Precision to three decimal places

        // Compare components with the specified precision
        (self.x - other.x).abs() < PRECISION
            && (self.y - other.y).abs() < PRECISION
            && (self.z - other.z).abs() < PRECISION
    }
}
