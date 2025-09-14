# 09_14_25

Yesterday I got the menu and saving stuff working much better. I'm pretty happy with how everything works now. I also restructred a lot of things and made chunk mesh rendering much quicker. I might want to move to some sort of shared memory thing for inserting chunks. I'm not sure why it is so slow still.

Goals for today
- Get multiplayer working again.
- Add an options screen for launching new games
- Speed up chunk loading again


# 09_13_25

I need to get the PR out, here are the remaining things to do
- Ensure the game scripts thing works
- Get mobile working
- Battle Test the server
- Add a single new fun game script: Falling blocks, the world blocks start falling and you have to jump to stay as high as possilbe

Then deploy this!



# 08_30_25

It's been a bit but I'm back. I've mostly been working on getting scripts to be serialzied. It is hard to get the wasm scripts to live in rust.

I'm currently trying to load the scripts and everything is moving forward.

I probably want to move to a similar structure as the Entities soon where a GameScript is a struct instead of a trait


# 06_03_25

I've worked more on optimizing the chunk insertion code. The release build of the app is much faster now and I'm happy with it.

I broke up the game updating code into a bunch of functions that I can run seperately and that is nice.

Next I want to work on setting the options for the game when you start it.

I think I can make it so options can be changed at run time.

# 06_02_25

I got the server working again. I want to fix chunk loading now, the chunks around me load in such a strange way, I can walk up to chunks and not have them load and I don't know why.

I've been profiling the code that inserts chunks, it isn't as optimal as it coudl be, but when I build in release mode it is pretty fast still on my computer when I have a full world generation. I think I shoudl maybe optimize the chunk insertion code a little bit still.

Okay, I brought the chunk insertion time down from around 30ms to 12ms. The biggest thing was removing hash maps and using arrays instead. I hate how slow rust hashmaps are.

# 05_27_25

I reworked the entity serialiaztion yesterday and I'm so happy with it now. Now I'm working on adding the fireballs back. They are working but they don't destory anything yet, I need to make them destroy blocks and hurt players.

What happens if you die? Maybe you just teleport back to the spawn.

Okay, now I'm testing the server again. I've found a couple errors and a lot fo files that didn't build. Now I'm getting an issue with the entity serialization, the components are not being serialized when being saved to the db. Idk what is going on.

# 05_26_25

I made the UI yesterday and it is coming along. I need to figure out what to do next. I think making the belt work seems good.
I also want to add back the fireball entity that breaks a block or injures a player. Then the players have health and they can get more health by eating a food item.

I also need to test the terrain generation and make that work better.I also need to add a button for saving while in single player mode.

# 05_25_25

I've fixed up the server now and multiplayer seems to work. I can now also add blocks to the game again. I don't know what is left for things that I'm confused about, maybe I should just start cleaning everything up now. Could work on mobile development as well.

List of things to do for single player:

- Add gravity and creative mode
- Fix movement controls
- Add back third person view

Claude found a bug that let the player fall through the world and came up with a good fix. That is crazy.

There are still times where the player can go through the world a little and I'm not sure why it happens. It is very rare. But now jumping and gravity works well.

Okay, I have fixed the movement. This is the best I have ever had it. I can run around complicated block structures and not clip through them or teleport. I had to do a better sorting system where I sorted by the amount a collision would move me, not how close one of my faces was to the collision.

# 05_21_25

I've worked on making the server runner. I'm relizing it doesn't make a lot of sense to serpatate out the sp-game-serivce and the runner. The cut between them isn't that clean. I will just make two different runners and then see what logic I need to abstract to make a good UI.

I've been thinking about the chunk flow. The server will be loading chunks with its sandbox game script, the client will also being doing this, but the client requests the chunks from the server instead of the terrain gen. This means the client could request a chunk too soon, but I shoudl probalby just load all the chunks around a player before they join? Maybe I can send them updates via sockets about what the server is doing.

I need to bring back fun loading spinners

Also the game shoudl have the property of chunkRequestor, not the client. The sandbox script shoudl be renamed to "loadchunksaroundentity" script and returns load requests to the game. The game then calls the request function on all chunks that the scripts returned, then the client will get from the server and give them to the local game and it will insert the chunks one by one.

## 05_19_25

We now can serialize the game state and save it to indexdb. It took a while to figure out how to serialize the entities. I went down a rabbit hole trying to get <https://github.com/dtolnay/typetag?tab=readme-ov-file> to work, but it doesn't support wasm-bindgen. I ended up just assuming everything was a player for now.

I've taken the strategy of "find the hardest problem and work on that until you know you can come back later and clean it up".

I've been thinking about how I can turn this into an RL training system. I'm pretty excited to try to do that.

The next hardest thing to me seems to be the server. It seem more complicated to me than it needs to be. This is how I think it should work:

- The server the game on a loop, anytime the game state changes it will be broadcast to all the clients.
- The server can change either because the game performs an action (like spawning an entity) or because the clients send actions to the server.
But I think there is a problem: If the game sends all of these diffs to the client, it will send an update to the client for every single action. That will be too much since the clients can compute the velocity themselves.

I think a good solution to this is to have "script actions" that are generated by game scripts. Then the server can mark the scripts whose actions will be sent to the client.
That way it can exclude scripts like "MovePlayer" but include ones like "SpawnCows" and then the client would not use the SpawnCow script.

I don't think we need to concept of "script actions". The scripts return GameDiffs in there update functions. I can just mark certain scripts to not have their diffs sent to the client.

This way "actions" are things that are predictable updates that are only made by clients. They can be sent over the wire. Scripts are logic that updates the game state in some way but may or may not be sent to the client.

Now when we receive an action from a client, we immediately apply it to the game state and send it to everyone. Then in the server update function, we run the game update, and send the diffs to the clients for only the scripts we want.

The client won't run the SandboxScript. The server will and it will just load chunks around the player. The player renderer then requests the chunks around the player. The render distance should be less than the load distance. So we shouldn't request chunks that aren't loaded. The get chunk logic should likely be moved to a rest endpoint.

Maybe I can use trpc to have everything be typed.

The game-service.ts, players.ts, and server-game.ts should all be combined into a single file.

I made a new SeverGameManager that i smuch much simplier. I'll have to move the game fetching and saving logic somewhere but it is nice.

I think I want it to be the case that players that aren't online are still entites in the game, they are just not moving.

That way I don't have to send welcome messages to everyone when they join. (But I still can for an "online" status) that would just need to be handled by the server instead of the engine and the clients would have differnet state.

Okay, everything is looking better. I haven't tested a thing but I'm going to go to sleep. I need to make a "server-runner" soon that copies a lot of the current runner but has different game scripts and sends actions to the server

## 05_18_25

This repo is in a messy state. It seems like a a lot of work is needed to clean it up. I think I was refactoring to have all of the entity logic in the rust code instead and I was half way through that. I think I'mm going to make a very simple
UI to begin with that uses the rust code and attempts to render everything instead of messing with the server stuff for now.

I got the actions to work in the UI. They are saved and updated. But the chunk rendering is a mess and isn't working.

Did a lot of work today making everything work with the UI. The wrapper isn't really needed as much anymore. I was half way through getting serializing to work but it isn't really done yet, some values aren't being saved to the DB.

## 07_11_24

Spent a while trying to figure out why cargo randomly rebuilt dependencies. Figured out it was turbo's issue? So I removed turbo and moved to just using yarn.

I also love the game script idea. It is cleaning things up nicely.

## 06_22_24

Trying to get the collision detection to be better with the player and the world.

Current plan:

- Make a lib funciton that takes a box (pos, dim) and a pos it wants to go to and return the position it can actually go to. If the box would hit something while moving to the new position, then find the shorted distance to make the box not collide with anything.

Basic form of function:

- Take all the world points of the block corner and the world points of the new potition. Create a line segment for each of these. Make a function that determines if a line segment is intersecting the world and at which point it intersects. Then find the line segment that minimizes the distance traveled and update all the box positions with that and return the new position and the face that it hit. Only stop applying force to a player if they hit something below them.

## Some other date

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

# 03/19/23

I've been fixing little things here and there. Added react to the home screen

I think the server isn't updating the game in it memory, it is just passing actions? Every time a game is fetched the progress isn't saved
