impl Player {
    fn move_in_direction(&mut self, directions: Vec<Direction>) {
        self.moving_directions = directions;
    }
}

impl Player {
    pub fn god_force(&self) -> Velocity {
        // add the current players roation to the direction
        let mut new_rot = self.rot;

        let dirs = self.moving_directions.clone();

        new_rot = dirs
            .into_iter()
            .fold(new_rot, |acc, direction| acc + direction.into());

        new_rot.into()
    }
}
