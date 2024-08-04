use super::{
    entity::{EntityAction, EntityId},
    game::PlayerScript,
    player::{Player, Velocity},
};
use crate::world::World;
use std::any::Any;

pub struct PlayerJumpAction {
    pub entityid: EntityId,
}

impl EntityAction for PlayerJumpAction {
    fn name(&self) -> &'static str {
        "Jump-Action"
    }

    fn entityid(&self) -> EntityId {
        self.entityid
    }
    fn data(&self) -> Box<dyn std::any::Any> {
        Box::new(())
    }
}

pub struct PlayerJumpScript {
    jump_speed: f32,
    is_jumping: bool,
    have_db_jumped: bool,
    jump_count: u8,
}

impl PlayerJumpScript {
    pub fn new() -> PlayerJumpScript {
        PlayerJumpScript {
            jump_speed: 2.0,
            is_jumping: false,
            have_db_jumped: false,
            jump_count: 0,
        }
    }

    fn jump_force(&mut self, player: &mut Player) -> Velocity {
        if player.is_flying {
            return Velocity::zero();
        }
        if !self.is_jumping {
            return Velocity::zero();
        }
        self.is_jumping = false;

        let diff_y_vel = self.jump_speed - player.vel.y;

        Velocity {
            x: 0.0,
            y: diff_y_vel,
            z: 0.0,
        }
    }

    pub fn jump(&mut self) {
        println!("Jump Called");
        self.is_jumping = true;
    }
}

impl PlayerScript for PlayerJumpScript {
    fn name(&self) -> &'static str {
        "Jump"
    }

    fn update(&mut self, world: &World, player: &mut Player) {
        let jump_force = self.jump_force(player);
        player.vel = jump_force + player.vel;
        println!("Jumping");
        println!("Jump force: {:?}", jump_force);
        println!("Player velocity: {:?}", player.vel);
    }

    fn handle_action(&mut self, action: Box<dyn EntityAction>) {
        println!("Handling action");

        if action.name() == "Jump-Action" {
            self.jump();
        }
    }
}
