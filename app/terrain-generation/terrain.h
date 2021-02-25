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
const int LOG_CHUNK_SIZE = 4;
const int CHUNK_HEIGHT = 64;
const int LOG_CHUNK_HEIGHT = 6;
const int CHUNK_DATA_LENGTH = CHUNK_HEIGHT * CHUNK_SIZE * CHUNK_SIZE;

typedef struct {
  Vector3D pos; 
  int blocks[CHUNK_DATA_LENGTH]; 
} Chunk;

typedef struct {
  Vector3D pos; 
  int * blocks; 
} ExportableChunk;

Chunk getChunk(int, int);

int * getChunkBlock(int, int);


