// #[derive(Serialize, Deserialize)]
// enum EntityAction {
//     Jump,
//     PrimaryAction,
//     SecondaryAction,
//     Move(Vec<Direction>),
//     ToggleFly,
//     Rotate(SphericalRotation),
//     TP(FineWorldPos),
// }
//
//
// #[repr(u8)]
// #[derive(Serialize, Deserialize)]
// pub enum GameAction {
//     Entity(EntityId, EntityAction),
// }

// trait Item {
//     fn use_item(&self, ent: &impl Entity) -> GameDiff;
// }
//
// struct FireballItem {
//     current_cooldown: u8,
//     cooldown: u8,
// }
//
// impl Item for FireballItem {
//     fn use_item(&self, ent: &impl Entity) -> GameDiff {
//         let mut diff = GameDiff::empty();
//
//         if self.current_cooldown > 0 {
//             return diff;
//         }

// Do math
// const vel = this.rot.toCartesianCoords().scalarMultiply(-0.4);
// vel.set(1, -vel.get(1));
//
// const pos = this.pos
//   .add(vel.scalarMultiply(2))
//   .add(new Vector3D(this.dim).scalarMultiply(0.5));
//
//
// let fireball_entity = FireballEntity {
//     pos: FineWorldPos {},
//     vel: Velocity,
//     life: 100,
// };
//
// let firebox = Box::new(fireball_entity);
// diff.new_entities.push(firebox);

//         diff
//     }
// }
//
// struct BlockItem {
//     block_type: BlockType,
// }
//
// impl Item for BlockItem {
//     fn use_item(&self, ent: &impl Entity) -> GameDiff {
//         let mut diff = GameDiff::empty();
// Do math
// const vel = this.rot.toCartesianCoords().scalarMultiply(-0.4);
// vel.set(1, -vel.get(1));
//
// const pos = this.pos
//   .add(vel.scalarMultiply(2))
//   .add(new Vector3D(this.dim).scalarMultiply(0.5));
//
//
// let block_entity = WorldBlock {
//     pos: FineWorldPos {},
//     block_type: self.block_type,
// };
// diff.new_blocks.push(block_entity);
// diff
// const ray = this.getRay();
// const lookingData = game.world.lookingAt(ray);
// if (!lookingData) return;
// console.log("Looking at data", lookingData);
// const { cube } = lookingData;
// if (!cube) return;
//
// const newCubePos = lookingData.cube.pos.add(
//   Vector3D.fromDirection(lookingData.face)
// );
//
// const newCube = CubeHelpers.createCube(blockType, newCubePos);
//
// console.log("Placed Cube", newCube);
//
// game.placeBlock(newCube);
//     }
// }

// enum Item {
//     Block(BlockType),
//     Fireball,
// }

// #[wasm_bindgen]
// struct Belt {
//     selected_index: u8,
//     items: Vec<Item>,
// }
