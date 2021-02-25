#include <stdio.h>
#include "terrain.h"

Chunk chunks[10];

void setSeed(char* seed) {
  printf("Hi!\n");
}

int posToChunkIndex(Vector3D pos) {
  int part1 = pos.x << (LOG_CHUNK_HEIGHT + LOG_CHUNK_SIZE);
  int part2 = pos.y << LOG_CHUNK_SIZE;
  int part3 = pos.z;
  return part1 + part2 + part3;
}

Chunk getChunk(int x, int z) {
  Chunk theChunk;

  // fill bottom layer of chunk with grass
  for (int i = 0; i < CHUNK_SIZE; i++){
    for (int j = 0; j < CHUNK_SIZE; j++) {
      Vector3D pos;
      pos.x = i;
      pos.y = 0;
      pos.z = j;
      int index = posToChunkIndex(pos);
      theChunk.blocks[index] = Grass;
    }
  }

  Vector3D chunkPos;
  chunkPos.x = 10;
  chunkPos.y = 20;
  chunkPos.z = 10;
  theChunk.pos = chunkPos;

  return theChunk;
}

Chunk world[10];

int * getChunkBlock(int x, int z) {
  Chunk c = getChunk(x, z);

  world[0] = c;
  
  return &(world[0].blocks[0]);
}



