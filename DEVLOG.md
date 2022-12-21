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

- Calculates the meshs and assigns them.

The world handles keeping mapping world values
