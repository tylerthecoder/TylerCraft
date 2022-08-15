# TODO

## Current "Sprint"

- Creating adding and getting blocks from the world.
- Make a "Universe" module that holds all the "Universe" code
- Move over everything to esmodules
- Add hot reloading of the world when the rust changes

## Tower Defense Project

### Motivation:

I want to make this system more of a test bed for playing with webgl.
I think a good way to force that kind of abstraction is to build a game inside of here.

### Tasks

Make system more dev friendly:

- Make endless terrain gen optional
- Test different chunk sizing. Make load chunks and chunk sizing act more as expected

Make entities with logic

- Make a block that explodes

- One entity that stays in place and knows the entities around it
- One entity that moves around

Make fireball game on the engine
After fireball game publish to internet

- Add path finding algorithm

# 3d

We want to get this to be able to be loaded on my site for a "3D view"

- Support fonts
- Ability to open links
- Many more blocks
- Make a loading spinner for when the game is still loading chunks
- Convert whatever possible to workers
- Make a chunk holder class
- Fix biome smoothing
- Make trees spawn on ground

- Make hands visible in VR.
- Make vr two player
- Make shooting fireballs work
- Make fireballs break one block
- Move in 4 spacial dimensions

# Web Assembly

## Idea

I want to convert some of the app over to web assembly so it run quicker.
Use Rust as my lower level language.

Convert the world over to wasm. This means all chunks and blocks will be stored in the wasm linear memory.
Will have to wrap the memory with a javascript class with methods like `getChunk` and `addBlock`
