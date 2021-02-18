#include <stdio.h>
#include </home/tyler/.local/share/emsdk/upstream/emscripten/system/include/emscripten/emscripten.h>

typedef struct {
  int x; 
  int y;
  int z;
} Vector3D;

enum Block {
  Void = 0,
  Grass = 1,
  Stone = 2,
  Wood = 3,
};

const int CHUNK_SIZE = 16;
const int CHUNK_HEIGHT = 64;

typedef struct {
  Vector3D pos; 
  enum Block blocks[CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT]; 
} Chunk;

EMSCRIPTEN_KEEPALIVE
int test() {
  printf("Hi!\n");
  return 4;
}

EMSCRIPTEN_KEEPALIVE
void setSeed(char* seed) {
  printf("Hi!\n");
}

int posToChunkIndex(Vector3D pos) {
  return (pos.x << CHUNK_HEIGHT * CHUNK_SIZE) + (pos.y << CHUNK_SIZE) + pos.z;
}

EMSCRIPTEN_KEEPALIVE
Chunk getChunk(int x, int z) {
  Chunk theChunk;
  // fill bottom layer of chunk with grass
  for (int i = 0; i < CHUNK_SIZE; i++){
    for (int j = 0; j < CHUNK_SIZE; j++) {
      Vector3D pos;
      pos.x = i;
      pos.y = 1;
      pos.x = j;
      int index = posToChunkIndex(pos);
      theChunk.blocks[index] = Grass;
    }
  }

  Vector3D chunkPos;
  chunkPos.x = 10;
  chunkPos.y = 20;
  chunkPos.z = 10;
  theChunk.pos = chunkPos;


  // TODO: somehow make this readable by javascript
  return theChunk;
}


