use crate::{
    direction::Direction,
    positions::{FineWorldPos, WorldPos},
};

#[derive(Debug, PartialEq)]
pub struct WorldPlane {
    pub world_pos: WorldPos,
    pub direction: Direction,
}

impl WorldPlane {
    pub fn new(world_pos: WorldPos, direction: Direction) -> WorldPlane {
        WorldPlane {
            world_pos,
            direction,
        }
    }

    /**
     *
     */
    pub fn get_relative_y(&self) -> i32 {
        self.world_pos.get_component_from_direction(self.direction)
            + match self.direction.is_outward() {
                true => 1,
                false => 0,
            }
    }

    // This is wrong, you have to add 1 sometimes for plane.
    // Up and Down are treated the same here
    pub fn contains(&self, pos: FineWorldPos) -> bool {
        // Going to term it in frame of x,y,z. This is a shift so it is easier to read.
        let my_y = self.get_relative_y();
        let (my_x, my_z) = self
            .world_pos
            .get_opposite_components_from_direction(self.direction);

        let their_y = pos.get_component_from_direction(self.direction);
        let (their_x, their_z) = pos.get_opposite_components_from_direction(self.direction);

        println!(
            "{} {} {} {} {} {}",
            my_y, my_x, my_z, their_y, their_x, their_z
        );

        let contains_y = (my_y as f32 - their_y).abs() < 0.01;
        let contains_x = (my_x as f32) - 0.01 <= their_x && my_x as f32 + 1.01 >= their_x;
        let contains_z = (my_z as f32) - 0.01 <= their_z && my_z as f32 + 1.01 >= their_z;

        println!(
            "contains_y: {}, contains_x: {}, contains_z: {}",
            contains_y, contains_x, contains_z
        );

        contains_y && contains_x && contains_z
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        direction::Direction,
        positions::{FineWorldPos, WorldPos},
    };

    use super::WorldPlane;

    // #[test]
    fn test_contains_up() {
        let plane = WorldPlane {
            world_pos: WorldPos::new(0, 0, 0),
            direction: Direction::Up,
        };

        assert!(plane.contains(FineWorldPos::new(0.0, 1.0, 0.0)));
        assert!(plane.contains(FineWorldPos::new(1.0, 1.0, 1.0)));
        assert!(!plane.contains(FineWorldPos::new(0.0, 0.0, 0.0)));
        assert!(!plane.contains(FineWorldPos::new(1.0, 1.0, -1.0)));
    }

    // #[test]
    fn test_contains_down() {
        let plane = WorldPlane {
            world_pos: WorldPos::new(0, 0, 0),
            direction: Direction::Down,
        };

        assert!(plane.contains(FineWorldPos::new(0.0, 0.0, 0.0)));
        assert!(plane.contains(FineWorldPos::new(1.0, 0.0, 1.0)));
        assert!(!plane.contains(FineWorldPos::new(0.0, 1.0, 0.0)));
    }

    // #[test]
    fn test_contains_east() {
        let plane = WorldPlane {
            world_pos: WorldPos::new(0, 0, 0),
            direction: Direction::East,
        };

        assert!(!plane.contains(FineWorldPos::new(0.0, 0.0, 0.0)));
        assert!(plane.contains(FineWorldPos::new(1.0, 0.0, 1.0)));
        assert!(plane.contains(FineWorldPos::new(1.0, 0.0, 1.0)));
        assert!(plane.contains(FineWorldPos::new(1.0, 0.0, 0.0)));
        assert!(!plane.contains(FineWorldPos::new(0.0, 1.0, 0.0)));
    }

    #[test]
    fn test_contains_far_east() {
        let plane = WorldPlane {
            world_pos: WorldPos::new(5, 0, 0),
            direction: Direction::East,
        };

        assert!(!plane.contains(FineWorldPos::new(0.0, 0.0, 0.0)));
        assert!(plane.contains(FineWorldPos::new(6.0, 0.0, 1.0)));
        assert!(plane.contains(FineWorldPos::new(6.0, 0.0, 0.0)));
        assert!(!plane.contains(FineWorldPos::new(0.0, 1.0, 0.0)));
        assert!(plane.contains(FineWorldPos::new(6.0, 2.0e-7, -5e-7)));
    }
}
