use crate::{
    chunk::CHUNK_WIDTH,
    vec::{Vec2, Vec3},
};

#[cfg(test)]
mod unit_tests;

pub type InnerChunkPos = Vec3<i8>;

impl InnerChunkPos {
    pub fn to_chunk_index(&self) -> usize {
        let x_part = (self.x as usize) << (4 + 6);
        let y_part = (self.y as usize) << 4;
        let z_part = self.z as usize;
        x_part + y_part + z_part
    }

    pub fn make_from_chunk_index(index: usize) -> InnerChunkPos {
        let x_part = (index >> (4 + 6)) as i8;
        let y_part = ((index & 01111110000) >> 4) as i8;
        let z_part = (index & 0b1111) as i8;
        InnerChunkPos::new(x_part, y_part, z_part)
    }

    pub fn to_world_pos(&self, chunk_pos: &ChunkPos) -> WorldPos {
        chunk_pos
            .scalar_mul(CHUNK_WIDTH)
            .move_to_3d(0)
            .map(|x| x as i8)
            .add_vec(*self)
            .map(|x| x as i32)
    }
}

pub type WorldPos = Vec3<i32>;
pub type ChunkPos = Vec2<i16>;

impl WorldPos {
    pub fn to_inner_chunk_pos(&self) -> InnerChunkPos {
        let x = ((self.x as i8 % 16) + 16) % 16;
        let y = self.y as i8;
        let z = ((self.z as i8 % 16) + 16) % 16;
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
}
