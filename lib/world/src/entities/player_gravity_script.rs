struct PlayerGravityScript {
    player: Player,
}

impl PlayerGravityScript {
    pub fn gravity_force(&self) -> Option<Velocity> {
        if self.player.is_flying {
            return None;
        }

        if self.player.on_ground {
            return None;
        }

        Some(Velocity {
            x: 0.0,
            y: self.player.gravity,
            z: 0.0,
        })
    }

    fn update(&mut self, world: &World) {
        let gravity_force = self.gravity_force();
        if let Some(gravity_force) = gravity_force {
            self.player.vel = gravity_force + self.player.vel;
        }

        // loop through scripts and update
    }
}
