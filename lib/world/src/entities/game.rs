use super::{
    entities::Entities,
    entity::{Entity, EntityId},
    entity_action::{EntityActionDto, EntityActionHolder},
    game_script::{GameScript, GameScripts, WasmGameScript},
};
use crate::{
    chunk::{chunk_fetcher::ChunkFetcher, Chunk, ChunkId},
    components::world_pos::WorldPos,
    entities::{
        entity_action::EntityActionDtoMaker,
        fireball::FireballScript,
        player::make_player,
        player_belt_script::{SecondaryBeltAction, SelectItemAction, UsePrimaryItemAction},
        player_gravity_script::GravityScript,
        player_jump_script::JumpAction,
        player_move_script::{MoveAction, MoveScript},
        player_rot_script::RotateAction,
        terrain_gen::TerrainGenerator,
        velocity_script::VelocityScript,
    },
    positions::ChunkPos,
    world::{world_block::WorldBlock, World},
};
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::{from_value, Error};
use uuid::Uuid;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};

#[wasm_bindgen(getter_with_clone)]
pub struct Game {
    pub name: String,
    pub id: String,
    pub world: World,
    pub entities: Entities,
    pub chunk_fetcher: ChunkFetcher,
    pub scripts: GameScripts,
    schedule: GameSchedule,
    action_holder: EntityActionHolder,
}

#[wasm_bindgen]
impl Game {
    fn add_default_scripts(&mut self) {
        self.scripts.add_script(Box::new(MoveScript::default()));
        self.scripts.add_script(Box::new(VelocityScript::default()));
        self.scripts.add_script(Box::new(GravityScript::default()));
        self.scripts.add_script(Box::new(FireballScript::default()));

        self.action_holder.add_handler(MoveAction::make_handler());
        self.action_holder.add_handler(JumpAction::make_handler());
        self.action_holder.add_handler(RotateAction::make_handler());
        self.action_holder
            .add_handler(UsePrimaryItemAction::make_handler());
        self.action_holder
            .add_handler(SecondaryBeltAction::make_handler());
        self.action_holder
            .add_handler(SelectItemAction::make_handler());

        self.update();
    }

    #[wasm_bindgen(constructor)]
    pub fn new() -> Game {
        console_error_panic_hook::set_once();
        let mut g = Game {
            name: "".to_string(),
            id: Uuid::new_v4().to_string(),
            world: World::default(),
            entities: Entities::new(),
            chunk_fetcher: ChunkFetcher::new_wasm(TerrainGenerator::default()),
            scripts: GameScripts::default(),
            schedule: GameSchedule::empty(),
            action_holder: EntityActionHolder::default(),
        };
        g.add_default_scripts();
        g
    }

    pub fn build(id: String, name: String, world: World, entities: Entities) -> Game {
        let mut g = Game {
            id,
            name,
            world,
            entities,
            chunk_fetcher: ChunkFetcher::new_wasm(TerrainGenerator::default()),
            scripts: GameScripts::default(),
            schedule: GameSchedule::empty(),
            action_holder: EntityActionHolder::default(),
        };
        g.add_default_scripts();
        g
    }

    pub fn handle_actions(&mut self) {
        let schedule = self
            .action_holder
            .handle_actions(&self.world, &mut self.entities);
        self.schedule.combine(schedule);
    }

    pub fn run_scripts(&mut self) {
        let world = &self.world;
        for script in self.scripts.get_scripts_mut() {
            let query = script.get_query();
            let query_results = self.entities.query(&query);
            let diff = script.update(world, query_results, &mut self.chunk_fetcher);
            if let Some(diff) = diff {
                self.schedule.combine(diff);
            }
        }
    }

    pub fn add_new_entities(&mut self) {
        let new_ents = std::mem::take(&mut self.schedule.new_entities);

        // Tell the scripts about the new entities
        self.scripts.iter_mut().for_each(|script| {
            for entity in new_ents.iter() {
                script.on_entity_update(entity.id);
            }
        });

        self.entities.get_all_mut().extend(new_ents);
        self.schedule.new_entities.clear();
    }

    pub fn remove_entities(&mut self) {
        for entity_id in self.schedule.removed_entities.clone() {
            self.entities
                .get_all_mut()
                .retain(|entity| entity.id != entity_id);

            self.scripts.iter_mut().for_each(|script| {
                script.on_entity_update(entity_id);
            });
        }
        self.schedule.removed_entities.clear();
    }

    pub fn add_single_chunk(&mut self) {
        let chunk = self.chunk_fetcher.consume_single_chunk();
        if let Some(chunk) = chunk {
            let chunk_id = chunk.get_id();
            self.world.insert_chunk(chunk);
            self.scripts.iter_mut().for_each(|script| {
                script.on_chunk_update(chunk_id);
            });
        }
    }

    pub fn add_blocks(&mut self) {
        let new_blocks = std::mem::take(&mut self.schedule.new_blocks);
        for block in new_blocks {
            self.world.add_block(&block).unwrap();
            self.scripts.iter_mut().for_each(|script| {
                let chunk_id = block.world_pos.to_chunk_pos().to_id();
                script.on_chunk_update(chunk_id);
            });
        }
        self.schedule.new_blocks.clear();
    }

    pub fn remove_blocks(&mut self) {
        let removed_blocks = std::mem::take(&mut self.schedule.removed_blocks);
        for block_pos in removed_blocks {
            self.world.remove_block(&block_pos).unwrap();
            self.scripts.iter_mut().for_each(|script| {
                let chunk_id = block_pos.to_chunk_pos().to_id();
                script.on_chunk_update(chunk_id);
            });
        }
        self.schedule.removed_blocks.clear();
    }

    pub fn update(&mut self) {
        self.handle_actions();
        self.run_scripts();
        self.add_new_entities();
        self.remove_entities();
        self.add_single_chunk();
        self.add_blocks();
        self.remove_blocks();
    }

    pub fn schedule_chunk_insert(&mut self, chunk: Chunk) {
        self.schedule.new_chunks.push(chunk)
    }

    pub fn schedule_entity_insert(&mut self, entity: Entity) {
        self.schedule.new_entities.push(entity);
    }

    pub fn make_and_add_player_wasm(&mut self, uid: EntityId) -> () {
        // skip if player already exists
        if self.entities.get_entity_by_id(uid).is_some() {
            return;
        }
        let player = make_player(uid);
        self.schedule_entity_insert(player);
        self.update();
    }

    pub fn handle_action_wasm(&mut self, action: EntityActionDto) {
        self.action_holder.add(action);
    }

    pub fn schedule_chunk_insert_wasm(&mut self, chunk: Chunk) {
        self.schedule_chunk_insert(chunk);
    }

    pub fn get_chunk_mesh_by_chunkid_wasm(&self, chunk_id: ChunkId) -> Result<JsValue, Error> {
        self.world.get_chunk_mesh_wasm(chunk_id)
    }

    pub fn get_chunk_pos_from_id_wasm(&self, chunk_id: ChunkId) -> Result<JsValue, Error> {
        let chunk_pos = ChunkPos::from_id(chunk_id);
        let chunk_pos_js = serde_wasm_bindgen::to_value(&chunk_pos).unwrap();
        Ok(chunk_pos_js)
    }

    pub fn get_chunk_id_from_chunk_pos_wasm(&self, value: JsValue) -> ChunkId {
        let chunk_pos: ChunkPos = from_value(value).unwrap();
        chunk_pos.to_id()
    }

    pub fn get_world_pos_from_chunk_pos_wasm(&self, x: i16, y: i16) -> Result<JsValue, Error> {
        let chunk_pos = ChunkPos { x, y };
        let world_pos: WorldPos = chunk_pos.to_world_pos();
        let world_pos_js = serde_wasm_bindgen::to_value(&world_pos).unwrap();
        Ok(world_pos_js)
    }

    pub fn get_chunk_pos_from_world_pos_wasm(
        &self,
        x: i32,
        y: i32,
        z: i32,
    ) -> Result<JsValue, Error> {
        let world_pos = WorldPos { x, y, z };
        let chunk_pos: ChunkPos = world_pos.to_chunk_pos();
        let chunk_pos_js = serde_wasm_bindgen::to_value(&chunk_pos).unwrap();
        Ok(chunk_pos_js)
    }

    pub fn get_loaded_chunk_ids_wasm(&self) -> Vec<u64> {
        return self.world.get_loaded_chunk_ids();
    }

    pub fn get_block_wasm(&self, x: i32, y: i32, z: i32) -> Result<JsValue, Error> {
        let world_pos = WorldPos { x, y, z };
        let block = self.world.get_block(&world_pos);
        let block_js = serde_wasm_bindgen::to_value(&block).unwrap();
        Ok(block_js)
    }

    pub fn get_chunk_wasm(&self, chunk_pos: ChunkPos) -> Result<JsValue, Error> {
        let chunk = self.world.get_chunk(&chunk_pos);
        let chunk_js = serde_wasm_bindgen::to_value(&chunk);
        chunk_js
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct GameDiff {
    pub updated_entities: Vec<EntityId>,
    pub updated_chunks: Vec<ChunkId>,
}

pub struct GameSchedule {
    pub new_entities: Vec<Entity>,
    pub new_blocks: Vec<WorldBlock>,
    pub new_chunks: Vec<Chunk>,
    pub removed_entities: Vec<EntityId>,
    pub removed_blocks: Vec<WorldPos>,
}

impl GameSchedule {
    pub fn empty() -> GameSchedule {
        GameSchedule {
            new_entities: Vec::new(),
            new_blocks: Vec::new(),
            new_chunks: Vec::new(),
            removed_entities: Vec::new(),
            removed_blocks: Vec::new(),
        }
    }

    pub fn clear(&mut self) {
        self.new_entities.clear();
        self.new_blocks.clear();
        self.new_chunks.clear();
        self.removed_entities.clear();
        self.removed_blocks.clear();
    }

    pub fn consume_single_chunk(&mut self) -> Option<Chunk> {
        self.new_chunks.pop()
    }

    pub fn to_game_diff(&self) -> GameDiff {
        let mut updated_entities: Vec<EntityId> =
            self.new_entities.iter().map(|entity| entity.id).collect();
        updated_entities.extend(self.removed_entities.iter().map(|entity_id| entity_id));

        let mut updated_chunks: Vec<ChunkId> = Vec::new();
        for block in self.new_blocks.iter() {
            let chunk_pos = block.world_pos.to_chunk_pos();
            if !updated_chunks.contains(&chunk_pos.to_id()) {
                updated_chunks.push(chunk_pos.to_id());
            }
        }
        for block_pos in self.removed_blocks.iter() {
            let chunk_pos = block_pos.to_chunk_pos();
            if !updated_chunks.contains(&chunk_pos.to_id()) {
                updated_chunks.push(chunk_pos.to_id());
            }
        }
        for new_chunk in self.new_chunks.iter() {
            if !updated_chunks.contains(&new_chunk.get_id()) {
                updated_chunks.push(new_chunk.get_id());
            }
        }

        GameDiff {
            updated_entities,
            updated_chunks,
        }
    }

    pub fn combine(&mut self, other: GameSchedule) {
        self.new_entities.extend(other.new_entities);
        self.new_blocks.extend(other.new_blocks);
        self.new_chunks.extend(other.new_chunks);
        self.removed_entities.extend(other.removed_entities);
        self.removed_blocks.extend(other.removed_blocks);
    }

    pub fn add_entity(&mut self, entity: Entity) {
        self.new_entities.push(entity)
    }

    pub fn add_block(&mut self, block: WorldBlock) {
        self.new_blocks.push(block);
    }

    pub fn remove_block(&mut self, block_pos: WorldPos) {
        self.removed_blocks.push(block_pos);
    }

    pub fn add_chunk(&mut self, chunk: Chunk) {
        self.new_chunks.push(chunk);
    }

    pub fn remove_entity(&mut self, entity_id: EntityId) {
        self.removed_entities.push(entity_id);
    }
}

mod tests {
    use crate::{
        components::{fine_world_pos::FineWorldPos, velocity::Velocity},
        direction::Direction,
        entities::{
            entity_action::EntityActionDtoMaker,
            game::Game,
            player::make_player,
            player_jump_script::{JumpAction, JumpActionData},
            player_move_script::{MoveAction, MoveActionData, MoveScript},
            velocity_script::{self, VelocityScript},
        },
    };

    #[test]
    pub fn add_player() {
        let mut game = Game::new();
        let player = make_player(1);
        game.schedule_entity_insert(player);
        game.update();

        // expect game to have a player in it
        game.entities.get_all_mut().iter().for_each(|ent| {
            assert_eq!(ent.id, 1);
        });
    }

    #[test]
    pub fn jump_script() {
        let mut game = Game::new();
        let player = make_player(1);
        game.schedule_entity_insert(player);
        game.update();
        let jump_action_handler = JumpAction::make_handler();
        game.action_holder.add_handler(jump_action_handler);
        let jump_action = JumpAction::make_dto(1, JumpActionData {});
        game.action_holder.add(jump_action);
        game.update();
        let player = game.entities.get_entity_by_id(1).unwrap();
        let player_vel = player.get::<Velocity>().unwrap();
        assert!(player_vel.y > 0.0);
    }

    #[test]
    pub fn move_script() {
        let mut game = Game::new();
        let player = make_player(1);
        player.print_components();

        game.schedule_entity_insert(player);
        game.update();

        let move_script = Box::new(MoveScript::default());
        game.scripts.add_script(move_script);
        game.update();

        let velocity_script = Box::new(VelocityScript::default());
        game.scripts.add_script(velocity_script);
        game.update();

        game.action_holder.add_handler(MoveAction::make_handler());

        let move_action = MoveAction::make_dto(
            1,
            MoveActionData {
                direction: Some(Direction::North),
            },
        );
        game.action_holder.add(move_action);
        game.update();

        let player = game.entities.get_entity_by_id(1).unwrap();
        let player_pos = player.get::<FineWorldPos>().unwrap();
        assert!(player_pos.z > 0.0);
    }

    // #[test]
    // pub fn generate_chunk() {
    //     let mut game = Game::new();
    //     let player = make_player(1);
    //     game.schedule_entity_insert(player);
    //     game.update();

    //     let sandbox_game_script = Box::new(SandBoxGScript::default());
    //     game.add_script(sandbox_game_script);
    //     game.update();

    //     // Check that chunks loaded
    //     let chunk_count = game.world.chunk_count();
    //     assert_eq!(chunk_count, 1);

    //     game.update();

    //     let chunk_count = game.world.chunk_count();
    //     assert_eq!(chunk_count, 2);
    // }
}
