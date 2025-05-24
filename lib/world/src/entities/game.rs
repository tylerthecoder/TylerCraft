use super::{
    entity::{Entity, EntityHolder, EntityId, SerializedEntityHolder},
    entity_action::EntityActionHolder,
    game_script::{EntityScriptHolder, GameScript},
};
use crate::{
    chunk::{Chunk, ChunkId},
    entities::{
        entity_action::EntityActionDtoMaker,
        player::wasm::Player,
        player_jump_script::JumpAction,
        player_move_script::{MoveAction, MoveScript},
        player_rot_script::RotateAction,
        velocity_script::VelocityScript,
    },
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
    entity_holder: EntityHolder,
    scripts: EntityScriptHolder,
    schedule: GameSchedule,
    action_holder: EntityActionHolder,
}

#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Game {
        console_error_panic_hook::set_once();
        let mut g = Game {
            name: "".to_string(),
            id: Uuid::new_v4().to_string(),
            world: World::default(),
            entity_holder: EntityHolder::new(),
            scripts: EntityScriptHolder::default(),
            schedule: GameSchedule::empty(),
            action_holder: EntityActionHolder::default(),
        };

        g.add_script(Box::new(MoveScript::default()));
        g.add_script(Box::new(VelocityScript::default()));
        g.update();

        // Add basic action handlers
        g.action_holder.add_handler(MoveAction::make_handler());
        g.action_holder.add_handler(JumpAction::make_handler());
        g.action_holder.add_handler(RotateAction::make_handler());

        g
    }

    pub fn build(id: String, name: String, world: World, entity_holder: EntityHolder) -> Game {
        let mut g = Game {
            id,
            name,
            world,
            entity_holder,
            scripts: EntityScriptHolder::default(),
            schedule: GameSchedule::empty(),
            action_holder: EntityActionHolder::default(),
        };

        g.add_script(Box::new(MoveScript::default()));
        g.add_script(Box::new(VelocityScript::default()));
        g.update();

        // Add basic action handlers
        g.action_holder.add_handler(MoveAction::make_handler());
        g.action_holder.add_handler(JumpAction::make_handler());
        g.action_holder.add_handler(RotateAction::make_handler());

        g
    }

    pub fn update(&mut self) {
        let world = &self.world;
        // apply actions

        self.action_holder.handle_actions(&mut self.entity_holder);

        for script in self.scripts.get_scripts_mut() {
            let query = script.get_query();
            let query_results = self.entity_holder.query(&query);
            let diff = script.update(world, query_results);
            if let Some(diff) = diff {
                self.schedule.combine(diff);
            }
        }

        let game_diff = self.schedule.to_game_diff();

        self.scripts.iter_mut().for_each(|script| {
            script.on_diff(game_diff.clone());
        });

        // Apply diff to game
        // Add all new entities
        let new_ents = std::mem::take(&mut self.schedule.new_entities);
        self.entity_holder.get_all_mut().extend(new_ents);

        // Remove entities
        for entity_id in self.schedule.removed_entities.clone() {
            self.entity_holder
                .get_all_mut()
                .retain(|entity| entity.id != entity_id);
        }

        // add chunks to world
        let new_chunks = std::mem::take(&mut self.schedule.new_chunks);
        for chunk in new_chunks {
            self.world.insert_chunk(chunk);
        }
    }

    pub fn schedule_chunk_insert(&mut self, chunk: Chunk) {
        self.schedule.new_chunks.push(chunk)
    }

    pub fn schedule_entity_insert(&mut self, entity: Entity) {
        self.schedule.new_entities.push(entity);
    }

    pub fn serialize_entities_wasm(&self) -> Result<JsValue, Error> {
        let serialized_entities = self.entity_holder.serialize();
        let serialized_entities_js = serde_wasm_bindgen::to_value(&serialized_entities).unwrap();
        Ok(serialized_entities_js)
    }

    pub fn deserialize_entities_wasm(&mut self, entities: JsValue) {
        let serialized_entities: SerializedEntityHolder =
            serde_wasm_bindgen::from_value(entities).unwrap();

        let entity_holder = EntityHolder::deserialize(serialized_entities);
        self.entity_holder = entity_holder;
    }

    pub fn deserialize_entity_wasm(&mut self, entity: JsValue) {
        let player: Player = from_value(entity).unwrap();
        let entity = Player::make_entity(&player);
        self.schedule_entity_insert(entity);
    }
}

impl Game {
    pub fn add_script(&mut self, script: Box<dyn GameScript>) {
        self.scripts.add_script(script);
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
    pub removed_blocks: Vec<WorldBlock>,
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

    pub fn to_game_diff(&self) -> GameDiff {
        let mut updated_entities: Vec<EntityId> =
            self.new_entities.iter().map(|entity| entity.id).collect();
        updated_entities.extend(self.removed_entities.iter().map(|entity_id| entity_id));
        let updated_chunks = self.new_chunks.iter().map(|chunk| chunk.get_id()).collect();
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
            sandbox::SandBoxGScript,
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
        game.entity_holder.get_all_mut().iter().for_each(|ent| {
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
        let player = game.entity_holder.get_entity_by_id(1).unwrap();
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
        game.add_script(move_script);
        game.update();

        let velocity_script = Box::new(VelocityScript::default());
        game.add_script(velocity_script);
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

        let player = game.entity_holder.get_entity_by_id(1).unwrap();
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

pub mod wasm {
    use std::{cell::RefCell, rc::Rc};

    use super::{Game, GameDiff, GameSchedule, GameScript};
    use crate::{
        chunk::{chunk_mesh::ChunkMesh, Chunk, ChunkId},
        components::world_pos::WorldPos,
        entities::{
            entity::{Entity, EntityId, EntityQueryResults},
            entity_action::{EntityActionDto, EntityActionDtoMaker},
            player::{make_player, wasm::Player},
            player_jump_script::JumpAction,
            player_move_script::{MoveAction, MoveScript},
            player_rot_script::RotateAction,
            sandbox::{self, SandBoxGScript},
            velocity_script::VelocityScript,
        },
        positions::ChunkPos,
        utils::js_log,
        world::World,
    };
    use serde_wasm_bindgen::{from_value, Error};
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    impl Game {
        pub fn make_and_add_player_wasm(&mut self, uid: EntityId) -> () {
            // skip if player already exists
            if self.entity_holder.get_entity_by_id(uid).is_some() {
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

        pub fn add_game_script_wasm(&mut self, script: WasmGameScript) {
            self.add_script(Box::new(script));
        }

        pub fn get_chunk_mesh_by_chunkid_wasm(&self, chunk_id: ChunkId) -> Result<JsValue, Error> {
            web_sys::console::log_1(&JsValue::from_str(&format!(
                "Rust Getting chunk mesh: {}",
                chunk_id
            )));
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

        pub fn get_player_wasm(&self, player_id: EntityId) -> Result<JsValue, Error> {
            let maybe_player = self.entity_holder.get_entity_by_id(player_id);
            if let Some(player) = maybe_player {
                let wasm_player = Player::make_from_entity(player);
                let player_js = serde_wasm_bindgen::to_value(&wasm_player).unwrap();
                Ok(player_js)
            } else {
                Err(Error::new(format!("Player {} not found", player_id)))
            }
        }

        pub fn get_players_wasm(&self) -> Result<JsValue, Error> {
            let players = self.entity_holder.get_all();
            let players_wasm: Vec<Player> = players
                .iter()
                .map(|player| Player::make_from_entity(player))
                .collect();
            let players_js = serde_wasm_bindgen::to_value(&players_wasm).unwrap();
            Ok(players_js)
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

    #[wasm_bindgen]
    #[derive(Debug)]
    pub struct WasmGameScript {
        context: JsValue,
        on_diff_jsfn: js_sys::Function,
    }

    #[wasm_bindgen]
    impl WasmGameScript {
        #[wasm_bindgen(constructor)]
        pub fn make(val: JsValue) -> WasmGameScript {
            let on_diff_jsfn = js_sys::Reflect::get(&val, &JsValue::from("onDiff")).unwrap();
            WasmGameScript {
                on_diff_jsfn: on_diff_jsfn.into(),
                context: val,
            }
        }
    }

    impl GameScript for WasmGameScript {
        fn update(
            &mut self,
            _world: &World,
            _query_results: EntityQueryResults,
        ) -> Option<GameSchedule> {
            None
        }

        fn on_diff(&self, diff: GameDiff) -> () {
            // console log diff
            let val = serde_wasm_bindgen::to_value(&diff).unwrap();
            self.on_diff_jsfn.call1(&self.context, &val).unwrap();
        }
    }
}
