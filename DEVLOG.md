Working out how update the chunk's visible faces. I think I will call is mesh now.

Seem to be a disconnect with how rust works and how I am trying to design this program.

Create 3 entities

Chunk

- Holds block info and performs basic get set operations.

ChunkMesh

- calculate all collision data
- Updates when chunk updates

World

- Stores overall structure of the blocks
- Shouldn't handle entities
- Keeps track of how to update meshes and chunks

Been playing with it more. Maybe there shouldn't be a Chunk Mesh at all. The world should just hold a giant map of world_positions to visible_faces?

## 12_20_22

There should be two objects loaded in memory for each chunk, the data of the chunk, and the mesh of the chunk.
Loading them in chunks allows the ability to unload chunks

Updated object purposes

Chunk

- handle the storage of groups of blocks.

Chunk Mesh

- Handle the storage of meshes.
- They might not have any logic at all, just be a struct. The world handles the calculation of them.

World

- Calculates the meshes and assigns them.

The world handles keeping mapping world values

What if the world block computed is visible faces and was passed an adjacent faces struct? I think I'm going to do that

Got a lot of cleaning work done, all of the logic makes sense now and I think it is a good way to handle storing the chunks and meshes. Going to have to write a bit more logic for the world side so the client can use it. But I might try to make it such that the world is the only interface and there is no js logic for chunks. It only creates chunks and passes them to the world. World will probably need to do some camera operations soon. I like the cleanup that was possible with the position structs. I think i'm really starting to get the mentality of struct. They don't have to be long lived, you can just throw data together and then define functions about how that data relates. Pretty fun. Next going to try to finish rust logic and write a bunch of tests for it.

Also getting rid of the concept of a block getter, The data should just be passed down to the block. So we just make a temp hashmap that points to the nearby blocks. Now the world block functions don't need to call functions on the world. I was being wayyyy to general by passing just a pointer to the world in first and still too general when I made the block getter. The only data it needs are the blocks near it so that is what it will get.

# 12 / 22 / 22

Starting to write tests for the world. Need to test things that will be used by the javascript.

# 12/ 22 / 23

Moving a lot of things over to structs. Trying to be more rust wherever I can. Turned `Directions` into a struct that can be iterated over.

# 12 / 26 / 22

Got all the tests to pass on the rust part. Need to add a couple more functions so I can get the visible faces to the chunk renderers.
Also need to return a `GameUpdateDiff` every time a block is added or removed.

# 1 / 2 / 23

So next thing I am going to do is code the following logic, some of it is already here but I need to make sur eit is all wired together.
When world is modified (block added or removed etc) return a `GameUpdateDiff`, need to fetch all the visible faces for all the modified chunks.

Need to move all visible faces to world renderer instead of chunk renderer, or at least create a chunk renderer on the fly.

Okay so now everything returns the game state diff. Where does this get processed. I guess in the world class.

# 1 / 3 / 23

Now I am going to remove all operations with visible faces from the chunk.
Going to move the looking at function over to rust because it will be fun.
The old way I did it was checking every single visible face in the chunk to see if the camera was looking at it. This time I am going to just step across the vector to see which blocks it could be touching, and check if they have a visible face that would intersect the line.

Built a lot of logic for determining collisions. I think the logic for looking at is going to be a lot cleaner. I had to build a lot of things for it that I think will be useful later.

# 1 / 10 / 23

Been slowly creating more geometry code.

Want to investigate any better build systems to get the multiple modules building in the right direction.

## Things wanted in a build system

- Build each module in a dependent way.
- Have multiple apps share a single build command.

rust world -> tsc builds each module -> webpack rebuilds

- 1 command running to build all typescript in build mode
  - Do this even to web processes like `client/web`. Webpack should not be running typescript, only tsc should be doing that.
- 1 command for listen to changes in `client/web` that restarts the webpack server when code changes.
  - webpack needs to process the javascript
  - Use fork-ts-checker-webpack-plugin to check typescript errors? Or just have webpack only watch the ts generated js.
- 1 command for listening to changes in `server` that restarts the server when code changes.
- 1 command for building rust code, when rust code changes, engine should rebuild, which should rebuild everything.

## 1 / 11 / 23

Using vite for building the web client
Seems to work almost perfectly out of the box. Had to change some imports around

Esmodulified a lot of the code. Vite works like a charm, I think it is auto reloading when things change but seems slight infrequent.
Need to work on a single typescript process that is running and build all the code / checking types.
Vite is fucking fast though.

## 1 / 16 / 23

I've been gotten the build working much quicker. The page still reloads twice when rust code changes.
Seems like it is once when the `.rs` file changes and once when the `.js` file changes. Trying to find out how to disable that.

Real issue seems to be that wasm_pack writes twice.

## 1 / 17 / 23

It now renders the chunks made in rust to the screen using the chunk mesh. Looks like it is including a couple extra faces that aren't needed but that can be fixed with time.



# 2 / 15 / 23

I've still been working here and there. Found a bug in the ray detection on the plane level. Test should be failing need to figure out why.

# 2 / 20 / 23

Finally got the ray intersection working. Wasn't considering the outward facing planes correctly. Only thing left is to fix the mesh rendering. It is off when you place new blocks.

# 2 / 21 / 23

Fixed the mesh rendering. Now seems like sometimes the block placement is wrong when you are rotated, might need to add some test cases for rotation.
Maybe it would be a good idea to look into hot module reloading so I can reload the world logic. Only hard part about that is the code stores the data about which block is in each chunk.

Deleting blocks doesn't work either

I think a better debug mode to aim to make is a way to have no chunks loaded, but I can fly around in a void and type a command to place a block anywhere.
Maybe also make it where the block face that is being looked at is highlighted

I guess to hot reload I could have something that looks like this
```
if (hot) {
  const state = game.save()
  reloadGameLogic()
  game.load(state)
}
```

Got the placing of a debug block working, just have to figure out how to place the block when there are no chunks. Do I want to check on the client if the chunk exists before inserting or add an option to automatically create the chunk if one doesn't exist.


# 6 / 10 / 23

Seems like deleting a block doesn't update the mesh.

I think it is because we get all blocks that aren't void in the chunk, then we update the mesh for them. Since we removed the block, it isn't returned in the array of all blocks, so we don't update at that location.

My idea to fix this is to add a dirty array to the chunk that is updated when a block is added or removed. Then when we update the mesh, we can check if the block is in the dirty array

That fixed it but it does not delete the dirty blocks in a chunk ever.


Seems to still be an issue with placing blocks. Sometimes a a block seems to be not found and the ray goes through it. Only seems to happen when x or y cord is negative.

Also might need to have a script that adds `type: module` to the package json in the wasm folder. That is preventing nodejs from loading the wasm module.


Think I want to work on high lighting the block that is being looked at for debug purposes. It will help with this stuff a lot.

Looks like the blocks that aren't being found are because the ray isn't even checking that block sometimes.

Found the issue. I made the ray check many more blocks while marching and it finds the correct one now.


It is now able to be built and deployed. But there seems still be be some minor issues
- infinite terrain generation doesn't work
- Transparent blocks have some issues
- Textures are rotated incorrectly


Working on infinite chunk generation. I want to make it so a single chunk is rendered a frame.

I made it where it now only sends a single chunk at a time to be loaded.


# 6 / 11 / 23

Added turbo repo and linting to the project. Moved everything around to make more sense and I think it is a good structure.
Want to work on fixing terrain gen next.


# 6 / 15 / 23

Multiplayer kind of works not but is not robust at all. And all the textures are rotated incorrectly.


Trying to think about the best way to have an entity be controlled by gpt4. Might want an "EntityController" that moves the entity around. Entities might have a "brain" that is passed in that controls the entity.

Maybe each entity needs a controller. The entity class controls the logic of the entity and the moves it can make. The controller calls those moves in interesting ways. The entity controller for a player might be a socket, a keyboard, or gpt4.

type entityController = {
  entity: Entity
  update: () => void
}


examples
keyboardPlayerController {
  setup() {
    // start event listeners for fast events
  }
  update() {
    call some entity moves
  }
}

socketPlayerController {
  setup() {
    // start socket listeners
  }
  update() {
    call some entity moves
  }
}


# 08/23/23

Thinking of what to work on next. I think rewritting the terrain generator in rust could be a good project


# 09/03/23

I've got covid, so I've had time to rewrite this is rust a bit. I've created a terrain gen app that does smooth height transitions, generates trees, and generates flowers. Making the trees be spread a part randomly is hard, but I solved it by doing it chunk by chunk and lazily loading the tree in nearby chunks to make sure there is no overlap. 

I noticed that the transparency is broken and that some of the textures are rotated incorrectly. I think I will fix that next.



# 09/04/23

Fixed transparency, it was an issue with the new way I'm doing mesh generation. Fixed textured being rotated incorrectly too. Now noticing that a tree's leafs are not included if they go over a chunk boundary. Tackling that next. 

Then I'll start thinking about biomes. 

