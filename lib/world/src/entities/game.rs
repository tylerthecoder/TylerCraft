use super::{
    entity::{Entity, EntityAction, EntityId},
    player::Player,
};
use crate::{
    chunk::{Chunk, ChunkId},
    world::{world_block::WorldBlock, World},
};
use serde::{Deserialize, Serialize};
use std::{any::Any, borrow::BorrowMut, collections::HashMap};
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};

pub trait GameScript {
    fn update(&self, world: &World, ents: &Vec<Box<Player>>, delta: u8) -> GameSchedule;
    fn on_diff(&self, diff: GameDiff) -> ();
}

pub trait PlayerScript: Any {
    fn name(&self) -> &'static str;
    fn update(&mut self, world: &World, player: &mut Player);
    fn handle_action(&mut self, action: EntityAction);
    fn as_any(&self) -> &dyn Any;
}

type ScriptId = u32;

#[wasm_bindgen]
pub struct Game {
    world: World,
    entities: Vec<Box<Player>>,
    game_scripts: Vec<Box<dyn GameScript>>,
    player_scripts: HashMap<ScriptId, Box<dyn PlayerScript>>,
    player_scripts_entity_map: HashMap<ScriptId, EntityId>,
    schedule: GameSchedule,
}

impl Game {
    pub fn new() -> Game {
        Game {
            world: World::default(),
            entities: Vec::new(),
            game_scripts: Vec::new(),
            player_scripts: HashMap::new(),
            player_scripts_entity_map: HashMap::new(),
            schedule: GameSchedule::empty(),
        }
    }

    pub fn add_script(&mut self, entity_id: EntityId, script: Box<dyn PlayerScript>) {
        let id = 1;
        self.player_scripts.insert(id, script);
        self.player_scripts_entity_map.insert(id, entity_id);
    }

    pub fn get_entity_script<T>(&self, entity_id: EntityId) -> Option<&T>
    where
        T: PlayerScript + Any,
    {
        let player_scripts: Vec<&Box<dyn PlayerScript>> = self
            .player_scripts
            .iter()
            .filter(|(script_id, _)| {
                let ent_id = *self
                    .player_scripts_entity_map
                    .get(script_id)
                    .expect("Script not found");
                ent_id == entity_id
            })
            .map(|(_, script)| script)
            .collect();

        println!("player_scripts_len: {:?}", player_scripts.len());

        for script in player_scripts.iter() {
            println!("script_name: {:?}", script.name());
        }

        let script = player_scripts
            .iter()
            .find_map(|script| script.as_any().downcast_ref::<T>());

        script
    }

    pub fn handle_action(&mut self, action: EntityAction) {
        for (id, script) in self.player_scripts.iter_mut() {
            let script_entity_id = *self
                .player_scripts_entity_map
                .get(id)
                .expect("Script not found");

            if action.entity_id == script_entity_id {
                script.handle_action(action);
                break;
            }
        }
    }

    pub fn update(&mut self) {
        let world = &self.world;

        // update all entities
        self.entities
            .iter_mut()
            .for_each(|entity| entity.update(world));

        for (script_id, script) in &mut self.player_scripts {
            let script_entity = *self
                .player_scripts_entity_map
                .get(script_id)
                .expect("Script not found");

            let mut player = self
                .entities
                .iter_mut()
                .find(|entity| entity.id() == script_entity)
                .expect("Player not found");

            script.update(world, &mut player);
        }

        // send diff to all scripts

        for gscript in &mut self.game_scripts {
            let diff = gscript.update(&self.world, &self.entities, 1);
            self.schedule.combine(diff)
        }

        self.game_scripts.iter().for_each(|script| {
            script.on_diff(self.schedule.to_game_diff());
        });

        // Apply diff to game
        // Add all new entities
        let new_ents = std::mem::take(&mut self.schedule.new_entities);
        self.entities.extend(new_ents);

        // Remove entities
        for entid in self.schedule.removed_entities.clone() {
            self.entities.retain(|entity| entity.id() != entid);
        }

        // add chunks to world
        let new_chunks = std::mem::take(&mut self.schedule.new_chunks);
        for chunk in new_chunks {
            self.world.insert_chunk(chunk);
        }
    }

    pub fn add_game_script(&mut self, game_script: Box<dyn GameScript>) {
        self.game_scripts.push(game_script);
    }

    pub fn get_entities(&self) -> &Vec<Box<Player>> {
        &self.entities
    }

    pub fn get_entity_by_id(&self, id: EntityId) -> Option<&Box<Player>> {
        self.entities.iter().find(|entity| entity.id() == id)
    }

    pub fn schedule_chunk_insert(&mut self, chunk: Chunk) {
        self.schedule.new_chunks.push(chunk)
    }

    pub fn schedule_entity_insert(&mut self, entity: Box<Player>) {
        self.schedule.new_entities.push(entity);
    }
}

#[derive(Serialize, Deserialize)]
pub struct GameDiff {
    pub updated_entities: Vec<EntityId>,
    pub updated_chunks: Vec<ChunkId>,
}

pub struct GameSchedule {
    pub new_entities: Vec<Box<Player>>,
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
            self.new_entities.iter().map(|entity| entity.id()).collect();
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

    pub fn add_entity(&mut self, entity: Box<Player>) {
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
    use crate::entities::{
        player::Player,
        player_jump_script::{PlayerJumpAction, PlayerJumpScript},
        sandbox::SandBoxGScript,
    };

    use super::*;

    #[test]
    pub fn jump_script() {
        let mut game = Game::new();
        let player = Box::new(Player::make(1));
        let jump_script = Box::new(PlayerJumpScript::new());
        game.schedule_entity_insert(player);
        game.update();
        game.add_script(1, jump_script);
        game.update();
        let jump_action = PlayerJumpAction::new(1);
        game.handle_action(jump_action);
        game.update();
        let player = game.get_entity_by_id(1).unwrap();
        assert!(player.vel.y > 0.0);

        let jump_script = game.get_entity_script::<PlayerJumpScript>(1);
        assert!(jump_script.is_some());
    }

    #[test]
    pub fn add_player() {
        let mut game = Game::new();
        let player = Box::new(Player::make(1));
        game.schedule_entity_insert(player);
        game.update();

        // expect game to have a player in it
        game.get_entities().iter().for_each(|ent| {
            assert_eq!(ent.id(), 1);
        });
    }

    #[test]
    pub fn generate_chunk() {
        let mut game = Game::new();
        let player = Box::new(Player::make(1));
        game.schedule_entity_insert(player);
        game.update();

        let sandbox_game_script = Box::new(SandBoxGScript::default());
        game.add_game_script(sandbox_game_script);
        game.update();

        // Check that chunks loaded
        let chunk_count = game.world.chunk_count();
        assert_eq!(chunk_count, 1);

        game.update();

        let chunk_count = game.world.chunk_count();
        assert_eq!(chunk_count, 2);
    }
}

pub mod wasm {
    use std::{cell::RefCell, rc::Rc};

    use super::{Game, GameDiff, GameSchedule, GameScript};
    use crate::{
        chunk::{chunk_mesh::ChunkMesh, Chunk, ChunkId}, entities::{
            entity::{EntityAction, EntityId},
            player::Player,
            player_rot_script::PlayerRotScript, sandbox::SandBoxGScript,
        }, positions::{ChunkPos, WorldPos}, world::World
    };
    use serde_wasm_bindgen::{from_value, Error};
    use wasm_bindgen::prelude::*;




    #[wasm_bindgen]
    impl Game {
        pub fn new_wasm() -> Game {
            let mut g = Game::new();
            let sandbox_game_script = Box::new(SandBoxGScript::default());
            g.add_game_script(sandbox_game_script);
            g.update();
            g
        }

        pub fn make_player_wasm() -> Player {
            Player::make(1)
        }

        pub fn update_wasm(&mut self) {
            self.update();
        }

        pub fn make_and_add_player_wasm(&mut self, uid: EntityId) -> () {
            let player = Player::make(uid);
            self.add_player_wasm(player);
        }

        pub fn get_player_rot_script(&self, player_id: EntityId) -> Option<PlayerRotScript> {
            self.get_entity_script::<PlayerRotScript>(player_id)
                .and_then(|script| Some(*script))
        }

        pub fn handle_action_wasm(&mut self, action: EntityAction) {
            self.handle_action(action);
        }

        pub fn schedule_chunk_insert_wasm(&mut self, chunk: Chunk) {
            self.schedule_chunk_insert(chunk);
        }

        pub fn add_game_script_wasm(&mut self, script: WasmGameScript) {
            self.add_game_script(Box::new(script));
        }

        pub fn get_chunk_mesh_by_chunkid_wasm(&self, chunk_id: ChunkId) -> Result<JsValue, Error> {
            web_sys::console::log_1(&JsValue::from_str(&format!("Rust Getting chunk mesh: {}", chunk_id)));
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

        pub fn get_chunk_pos_from_world_pos_wasm(&self, x: i32, y: i32, z: i32) -> Result<JsValue, Error> {
            let world_pos = WorldPos { x, y, z };
            let chunk_pos: ChunkPos = world_pos.to_chunk_pos();
            let chunk_pos_js = serde_wasm_bindgen::to_value(&chunk_pos).unwrap();
            Ok(chunk_pos_js)
        }

        pub fn add_player_wasm(&mut self, player: Player) {
            self.schedule_entity_insert(Box::new(player));
        }

        pub fn get_player_wasm(&self, player_id: EntityId) -> Result<JsValue, Error> {
            let maybe_player = self.get_entity_by_id(player_id);
            if let Some(player) = maybe_player {
                let player_js = serde_wasm_bindgen::to_value(&player).unwrap();
                Ok(player_js)
            } else {
                Err(Error::new("Player not found"))
            }
        }

        pub fn get_entities_wasm(&self) -> Result<JsValue, Error> {
            let entities = self.get_entities();
            let entities_js = serde_wasm_bindgen::to_value(&entities).unwrap();
            Ok(entities_js)
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
    }

    #[wasm_bindgen]
    pub struct WasmGameScript {
        context: JsValue,
        on_diff_jsfn: js_sys::Function,
    }

    #[wasm_bindgen]
    impl WasmGameScript {
        pub fn make(val: JsValue) -> WasmGameScript {
            let on_diff_jsfn = js_sys::Reflect::get(&val, &JsValue::from("onDiff")).unwrap();
            WasmGameScript {
                on_diff_jsfn: on_diff_jsfn.into(),
                context: val,
            }
        }
    }

    impl GameScript for WasmGameScript {
        fn update(&self, world: &World, ents: &Vec<Box<Player>>, delta: u8) -> GameSchedule {
            GameSchedule::empty()
        }

        fn on_diff(&self, diff: GameDiff) -> () {
            // console log diff
            let val = serde_wasm_bindgen::to_value(&diff).unwrap();
            self.on_diff_jsfn.call1(&self.context, &val).unwrap();
        }
    }
}
