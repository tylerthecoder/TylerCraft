use crate::{
    block::{BlockData, BlockMetaData, BlockShape, BlockType, ChunkBlock},
    direction::{Direction, Directions},
    positions::WorldPos, geometry::{box_mesh::{BoxMesh, Size3}, ray::DirectionRay},
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;


#[derive(Debug, Serialize, Deserialize, PartialEq, Eq, Clone, Copy)]
pub struct WorldBlock {
    pub block_type: BlockType,
    pub extra_data: BlockData,
    pub world_pos: WorldPos,
}

impl WorldBlock {
    pub fn empty(world_pos: WorldPos) -> WorldBlock {
        WorldBlock {
            block_type: BlockType::Void,
            extra_data: BlockData::None,
            world_pos,
        }
    }

    pub fn to_chunk_block(&self) -> ChunkBlock {
        ChunkBlock {
            pos: self.world_pos.to_inner_chunk_pos(),
            block_type: self.block_type,
            extra_data: self.extra_data,
        }
    }

    /**
     * Returns true if the current world block would be seen through the adjacent block
     */
    fn is_block_face_visible(&self, adjacent_block: &WorldBlock) -> bool {
        if adjacent_block.block_type == BlockType::Void {
            return true;
        }

        let block_data = self.get_metadata();
        let adjacent_block_data = adjacent_block.get_metadata();

        if adjacent_block_data.transparent {
            return true;
        }

        if block_data.fluid && adjacent_block_data.fluid {
            return true;
        }

        return false;
    }

    pub fn get_visible_faces(&self, adjacent_blocks: HashMap<Direction, WorldBlock>) -> Directions {
        if self.block_type == BlockType::Void {
            return Directions::empty();
        }

        self.get_faces()
            .into_iter()
            .filter(|direction| match adjacent_blocks.get(direction) {
                Some(adjacent_block) => self.is_block_face_visible(adjacent_block),
                None => true,
            })
            .collect::<Directions>()
    }

    pub fn get_faces(&self) -> Directions {
        match self.get_metadata().shape {
            BlockShape::Cube => Directions::all(),
            BlockShape::X => Directions::all(),
            BlockShape::Flat => match self.extra_data {
                BlockData::Image(direction) => Directions::create_for_direction(direction),
                _ => Directions::all(),
            },
        }
    }

    pub fn get_metadata(&self) -> &BlockMetaData {
        BlockMetaData::get_for_type(self.block_type)
    }


    // MESH
    // Pass in a box mesh and I'll return the shortest distance it needs to move to leave the box
    pub fn push_out(&self, box_mesh: &BoxMesh) -> Option<DirectionRay> {
        let my_mesh = BoxMesh {
            pos: self.world_pos.to_fine_world_pos(),
            dim: Size3::new(1.0, 1.0, 1.0),
        };

        let inside_corners = box_mesh.get_world_points().iter().filter(|corner| {
            my_mesh.is_point_inside(*corner)
        }).collect::<Vec<_>>();

        let cube_size: Size3 = crate::vec::Vec3 { x:1.0, y:1.0, z:1.0 };

        let pos = self.world_pos.into_iter();
        let dim = cube_size.into_iter();

        let mesh_pos = box_mesh.pos.into_iter();
        let mesh_dim = box_mesh.dim.into_iter();

        let zipped = pos.zip(dim).zip(mesh_pos).zip(mesh_dim);

        zipped.map(|(((my_pos, my_dim), mesh_pos), mesh_dim)| {
            let my_pt_1 = my_pos as f32;
            let my_pt_2 = my_pos as f32 + my_dim;

            let mesh_pt_1 = mesh_pos as f32;
            let mesh_pt_2 = mesh_pos as f32 + mesh_dim;

            // Are either of the mesh points in me? 

            if my_pt_1 < mesh_pt_1 && mesh_pt_1 < my_pt_2 {
                // mesh_pt_1 is in me
            } else if my_pt_1 < mesh_pt_2 && mesh_pt_2 < my_pt_2 {
                // mesh_pt_2 is in me
            } else {
                // neither are in me
            }
        });

        // zip pos and dimention together
        // for (((my_pos, my_dim), mesh_pos), mesh_dim) in zipped { 
        //
        //     let my_pt_1 = my_pos as f32;
        //     let my_pt_2 = my_pos as f32 + my_dim;
        //
        //     let mesh_pt_1 = mesh_pos as f32;
        //     let mesh_pt_2 = mesh_pos as f32 + mesh_dim;
        //
        //     // Are either of the mesh points in me? 
        //
        //     if my_pt_1 < mesh_pt_1 && mesh_pt_1 < my_pt_2 {
        //         // mesh_pt_1 is in me
        //     } else if my_pt_1 < mesh_pt_2 && mesh_pt_2 < my_pt_2 {
        //         // mesh_pt_2 is in me
        //     } else {
        //         // neither are in me
        //         continue;
        //     }
        // }

        Some(())
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        block::{BlockData, BlockType},
        direction::Direction,
        positions::WorldPos,
        world::world_block::WorldBlock,
    };
    use std::collections::HashMap;

    #[test]
    fn is_block_face_visible() {
        let world_block = WorldBlock {
            block_type: BlockType::Cloud,
            extra_data: BlockData::None,
            world_pos: WorldPos { x: 0, y: 0, z: 0 },
        };

        let adjacent_world_block = WorldBlock {
            block_type: BlockType::Cloud,
            extra_data: BlockData::None,
            world_pos: WorldPos { x: 0, y: 0, z: 0 },
        };

        let is_visible = world_block.is_block_face_visible(&adjacent_world_block);

        assert_eq!(is_visible, false);

        let adjacent_world_block = WorldBlock {
            block_type: BlockType::Void,
            extra_data: BlockData::None,
            world_pos: WorldPos { x: 0, y: 0, z: 0 },
        };

        let is_visible = world_block.is_block_face_visible(&adjacent_world_block);

        assert_eq!(is_visible, true);
    }

    #[test]
    fn gets_visible_faces() {
        let world_block = WorldBlock {
            block_type: BlockType::Cloud,
            extra_data: BlockData::None,
            world_pos: WorldPos { x: 0, y: 0, z: 0 },
        };

        let adjacent_blocks = HashMap::new();

        let faces = world_block.get_visible_faces(adjacent_blocks);

        assert_eq!(faces.into_iter().len(), 6);

        let mut adjacent_blocks: HashMap<Direction, WorldBlock> = HashMap::new();

        adjacent_blocks.insert(
            Direction::East,
            WorldBlock {
                block_type: BlockType::Cloud,
                extra_data: BlockData::None,
                world_pos: WorldPos { x: 0, y: 0, z: 0 },
            },
        );

        let faces = world_block.get_visible_faces(adjacent_blocks);

        assert_eq!(faces.into_iter().len(), 5);
        assert_eq!(faces.has_direction(Direction::East), false);
    }
}
