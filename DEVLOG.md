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