use super::{
    entity::{Entity, EntityAction, EntityId},
    player::{Player, WorldBlock},
};
use crate::{chunk::Chunk, world::World};
use std::{any::Any, borrow::BorrowMut, collections::HashMap};
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};

pub trait GameScript {
    fn update(&self, world: &World, ents: &Vec<Box<Player>>, delta: u8) -> GameDiff;
    fn on_diff(&self, diff: &GameDiff) -> ();
}

// #[wasm_bindgen]
// struct JsGameScript {
//     update_jsfn: js_sys::Function,
// }
//
// impl GameScript for JsGameScript {
//     fn update(&self, delta: u8) -> () {
//         let val = JsValue::from(delta);
//         // let res = self.update_jsfn.call1(&val);
//         // print the error
//         // if let Err(e) = res {
//         //     let err = Error::from(e);
//         // };
//     }
//
//     fn on_diff(&self, diff: &GameDiff) -> () {
//         todo!()
//     }
// }
//
// #[wasm_bindgen]
// impl JsGameScript {
//     pub fn make(val: JsValue) -> JsGameScript {
//         let update_fn = js_sys::Reflect::get(&val, &JsValue::from("update")).unwrap();
//
//         JsGameScript {
//             update_jsfn: update_fn.into(),
//         }
//     }
// }

pub trait PlayerScript {
    fn name(&self) -> &'static str;
    fn update(&mut self, world: &World, player: &mut Player);
    fn handle_action(&mut self, action: Box<dyn EntityAction>);
}

type ScriptId = u32;

#[wasm_bindgen]
pub struct Game {
    world: World,
    entities: Vec<Box<Player>>,
    game_scripts: Vec<Box<dyn GameScript>>,
    player_scripts: HashMap<ScriptId, Box<dyn PlayerScript>>,
    player_scripts_entity_map: HashMap<ScriptId, EntityId>,
    diff: GameDiff,
}

// #[wasm_bindgen]
impl Game {
    pub fn new() -> Game {
        Game {
            world: World::default(),
            entities: Vec::new(),
            game_scripts: Vec::new(),
            player_scripts: HashMap::new(),
            player_scripts_entity_map: HashMap::new(),
            diff: GameDiff::empty(),
        }
    }

    pub fn add_script(&mut self, entity_id: EntityId, script: Box<dyn PlayerScript>) {
        let id = 1;
        self.player_scripts.insert(id, script);
        self.player_scripts_entity_map.insert(id, entity_id);
    }

    pub fn handle_action(&mut self, action: Box<dyn EntityAction>) {
        for (id, script) in self.player_scripts.iter_mut() {
            let script_entity_id = *self
                .player_scripts_entity_map
                .get(id)
                .expect("Script not found");

            if action.entityid() == script_entity_id {
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
            self.diff.combine(diff)
        }

        self.game_scripts.iter().for_each(|script| {
            script.on_diff(&self.diff);
        });

        // Apply diff to game
        // Add all new entities
        let new_ents = std::mem::take(&mut self.diff.new_entities);
        self.entities.extend(new_ents);

        // Remove entities
        for entid in self.diff.removed_entities.clone() {
            self.entities.retain(|entity| entity.id() != entid);
        }

        // add chunks to world
        let new_chunks = std::mem::take(&mut self.diff.new_chunks);
        for chunk in new_chunks {
            self.world.insert_chunk(*chunk);
        }
    }
}

impl Game {
    pub fn add_game_script(&mut self, game_script: Box<dyn GameScript>) {
        self.game_scripts.push(game_script);
    }

    pub fn get_entities(&self) -> &Vec<Box<Player>> {
        &self.entities
    }

    pub fn get_entity_by_id(&self, id: EntityId) -> Option<&Box<Player>> {
        self.entities.iter().find(|entity| entity.id() == id)
    }

    pub fn schedule_chunk_insert(&mut self, chunk: Box<Chunk>) {
        self.diff.new_chunks.push(chunk)
    }

    pub fn schedule_entity_insert(&mut self, entity: Box<Player>) {
        self.diff.new_entities.push(entity);
    }
}

pub struct GameDiff {
    pub new_entities: Vec<Box<Player>>,
    pub new_blocks: Vec<WorldBlock>,
    pub new_chunks: Vec<Box<Chunk>>,
    pub removed_entities: Vec<EntityId>,
    pub removed_blocks: Vec<WorldBlock>,
}

impl GameDiff {
    pub fn empty() -> GameDiff {
        GameDiff {
            new_entities: Vec::new(),
            new_blocks: Vec::new(),
            new_chunks: Vec::new(),
            removed_entities: Vec::new(),
            removed_blocks: Vec::new(),
        }
    }

    pub fn combine(&mut self, other: GameDiff) {
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

    pub fn add_chunk(&mut self, chunk: Box<Chunk>) {
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
        let jump_action = Box::new(PlayerJumpAction { entityid: 1 });
        game.handle_action(jump_action);
        game.update();
        let player = game.get_entity_by_id(1).unwrap();
        assert!(player.vel.y > 0.0);
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
    }
}
