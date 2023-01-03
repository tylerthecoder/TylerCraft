use crate::{
    block::WorldBlock,
    camera::{self, Camera},
    direction::Direction,
};

use super::World;

pub struct LookingAt {
    /**
     * The block a camera is pointing at
    	*/
    block: WorldBlock,
    /**
     * The face of the block that is being looked at
     */
    face: Direction,
    /**
     * How far the face is away from the camera
     */
    distance: f32,
}

impl World {
    /**
     * Basic idea: start at the camera, march forward by one block and check if any of the surrounding blocks intersect the line. Keep going until an intersection is found or the march distance is greater than some "Reach" value.
     */
    fn looking_at(&self, camera: Camera) -> LookingAt {
        // Check the blocks around the camera
        camera
            .pos
            .to_world_pos()
            .get_adjacent_vecs()
            .iter()
            .for_each(|pos| {
                let dirs = self.get_mesh_at_pos(pos.to_owned());
            });
    }
}
