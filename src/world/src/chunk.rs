use crate::block::{
    cube_faces, get_visible_faces, BlockData, BlockMetaData, BlockType, WasmBlock, WasmImageData,
    WorldBlock,
};
use crate::direction::{Direction, Directions};
use crate::vec::Vec3;
use crate::world::{ChunkPos, World, WorldPos};
use serde::{Deserialize, Serialize};
use serde_big_array::BigArray;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    // Use `js_namespace` here to bind `console.log(..)` instead of just
    // `log(..)`
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    // The `console.log` is quite polymorphic, so we can bind it with multiple
    // signatures. Note that we need to use `js_name` to ensure we always call
    // `log` in JS.
    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_u32(a: usize);

    // Multiple arguments too!
    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_many(a: &str, b: &str);
}

pub const CHUNK_WIDTH: i16 = 16;
pub const CHUNK_HEIGHT: i16 = 64;

const CHUNK_MEM_SIZE: usize = (CHUNK_HEIGHT * CHUNK_WIDTH * CHUNK_WIDTH) as usize;

pub type InnerChunkPos = Vec3<i8>;

#[derive(Serialize, Deserialize)]
pub struct BlockWithFaces {
    pub world_pos: WorldPos,
    // true is the face is visible
    pub faces: Directions,
}

pub type VisibleFaces = Vec<BlockWithFaces>;

#[wasm_bindgen]
impl Chunk {
    pub fn get_block_wasm(&self, x: i8, y: i8, z: i8) -> JsValue {
        let block = self.get_block(&InnerChunkPos { x, y, z });
        JsValue::from_serde(&block).unwrap()
    }

    pub fn get_chunk_id(&self) -> String {
        self.position.to_index()
    }

    pub fn get_visible_faces(&self) -> JsValue {
        JsValue::from_serde(&self.visible_faces).unwrap()
    }

    pub fn add_block_wasm(&mut self, js_block: JsValue) -> () {
        let world_block: WorldBlock = js_block.into_serde().unwrap();

        let inner_pos = World::world_pos_to_inner_chunk_pos(&world_block.world_pos);

        self.add_block(&inner_pos, world_block.block_type, world_block.extra_data);
    }

    pub fn deserialize(js_value: JsValue) -> Chunk {
        js_value.into_serde().unwrap()
    }

    pub fn serialize(&self) -> Result<JsValue, JsValue> {
        Ok(serde_wasm_bindgen::to_value(&self)?)
    }

    // Need to see if this will mess up the hash map that is pointing to this chunk.
    pub fn set(&mut self, js_value: JsValue) -> () {
        let chunk: Chunk = js_value.into_serde().unwrap();
        *self = chunk;
    }

    pub fn make_wasm(x: i16, y: i16) -> Chunk {
        Chunk::new(ChunkPos { x, y })
    }

    pub fn get_visible_faces_wasm(&self) -> JsValue {
        JsValue::from_serde(&self.visible_faces).unwrap()
    }

    pub fn calculate_visible_faces_wasm(&mut self, world: &World) -> () {
        self.calculate_visible_faces(world);
    }
}

#[derive(Serialize, Deserialize)]
#[wasm_bindgen]
pub struct Chunk {
    #[serde(with = "BigArray")]
    blocks: [BlockType; CHUNK_MEM_SIZE],
    block_data: HashMap<usize, BlockData>,
    #[wasm_bindgen(skip)]
    pub visible_faces: VisibleFaces,
    #[wasm_bindgen(skip)]
    pub position: ChunkPos,
}

impl Chunk {
    fn pos_to_index(pos: &InnerChunkPos) -> usize {
        let x_part = (pos.x as usize) << (4 + 6);
        let y_part = (pos.y as usize) << 4;
        let z_part = pos.z as usize;
        x_part + y_part + z_part
    }

    fn index_to_pos(index: usize) -> InnerChunkPos {
        let x_part = (index >> (4 + 6)) as i8;
        let y_part = ((index & 01111110000) >> 4) as i8;
        let z_part = (index & 0b1111) as i8;
        InnerChunkPos::new(x_part, y_part, z_part)
    }

    pub fn new(position: ChunkPos) -> Chunk {
        Chunk {
            blocks: [BlockType::Void; CHUNK_MEM_SIZE],
            block_data: HashMap::new(),
            visible_faces: Vec::new(),
            position,
        }
    }

    pub fn calculate_visible_faces(&mut self, world: &World) -> () {
        let data = self
            .blocks
            .iter()
            .enumerate()
            .filter(|(_i, &b)| b != BlockType::Void)
            .map(|(index, block_type)| {
                let block = self.get_full_block_from_index(index);
                if block.block_type == BlockType::Void {
                    web_sys::console::log_1(&JsValue::from_str(&format!(
                        "Setting as void {:?}",
                        block_type
                    )));
                }
                BlockWithFaces {
                    faces: get_visible_faces(&block, world),
                    world_pos: block.world_pos,
                }
            })
            .collect();

        self.visible_faces = data;
    }

    pub fn get_uuid(&self) -> String {
        self.position.to_index()
    }

    pub fn add_block(&mut self, pos: &InnerChunkPos, block: BlockType, block_data: BlockData) {
        let index = Self::pos_to_index(pos);
        self.block_data.insert(index, block_data);
        self.blocks[index] = block
    }

    fn chunk_pos_to_world_pos(&self, chunk_pos: &InnerChunkPos) -> WorldPos {
        self.position
            .scalar_mul(CHUNK_WIDTH)
            .move_to_3d(0)
            .map(|x| x as i8)
            .add_vec(*chunk_pos)
            .map(|x| x as i32)
    }

    fn get_block_type_at_index(&self, index: usize) -> BlockType {
        match self.blocks.get(index) {
            Some(block) => *block,
            None => BlockType::Void,
        }
    }

    fn get_block_data_from_index(&self, index: &usize) -> &BlockData {
        self.block_data.get(index).unwrap_or(&BlockData::None)
    }

    fn get_full_block_from_index(&self, index: usize) -> WorldBlock {
        let block_type = self.get_block_type_at_index(index);
        let block_data = self.get_block_data_from_index(&index);
        let inner_chunk_pos = Self::index_to_pos(index);

        let world_pos = self.chunk_pos_to_world_pos(&inner_chunk_pos);

        WorldBlock {
            block_type,
            extra_data: *block_data,
            world_pos,
        }
    }

    pub fn get_block(&self, pos: &InnerChunkPos) -> BlockType {
        let index = Self::pos_to_index(pos);
        self.get_block_type_at_index(index)
    }

    pub fn get_full_block(&self, pos: &InnerChunkPos) -> WorldBlock {
        let index = Self::pos_to_index(pos);
        self.get_full_block_from_index(index)
    }

    pub fn get_block_data(&self, pos: &InnerChunkPos) -> &BlockData {
        let index = Self::pos_to_index(pos);
        self.get_block_data_from_index(&index)
    }

    pub fn remove_block(&mut self, pos: &InnerChunkPos) -> () {
        let index = Self::pos_to_index(pos);
        self.blocks[index] = BlockType::Void;
    }
}

mod tests {
    use crate::world::{World, WorldPos};

    use super::{Chunk, ChunkPos, InnerChunkPos};

    #[test]
    fn index_conversion() {
        let index = Chunk::pos_to_index(&InnerChunkPos::new(1, 2, 3));
        assert_eq!(index, 1024 + 32 + 3);
        let pos = Chunk::index_to_pos(index);
        assert_eq!(pos, InnerChunkPos::new(1, 2, 3));
    }

    #[test]
    fn conversion() {
        let inner_chunk_pos = InnerChunkPos::new(1, 2, 3);
        let chunk = Chunk::new(ChunkPos { x: 0, y: 0 });

        let world_pos = chunk.chunk_pos_to_world_pos(&inner_chunk_pos);

        assert_eq!(world_pos, WorldPos { x: 1, y: 2, z: 3 });
    }
}
