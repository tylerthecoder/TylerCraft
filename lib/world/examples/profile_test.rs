use std::time::{Duration, Instant};
use world::{entities::terrain_gen::TerrainGenerator, positions::ChunkPos, world::World};

fn main() {
    // This reproduces the profile_chunk_insertion test as a standalone example
    let terrain_gen = TerrainGenerator::new(0, false, false);

    let mut times = Vec::new();
    for _i in 0..500 {
        let start_time = Instant::now();
        let mut world = World::default();
        let chunk_pos = ChunkPos::new(0, 0);
        let chunk = terrain_gen.get_chunk(chunk_pos.x, chunk_pos.y);
        world.insert_chunk(chunk);
        times.push(start_time.elapsed());
    }

    println!(
        "Average time: {:?}",
        times.iter().sum::<Duration>() / times.len() as u32
    );
    println!("Max time: {:?}", times.iter().max().unwrap());
}
