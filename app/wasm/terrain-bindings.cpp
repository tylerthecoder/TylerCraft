#include </home/tyler/.local/share/emsdk/upstream/emscripten/system/include/emscripten/bind.h>
#include "terrain.cpp"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(my_value_example) {
  emscripten::value_object<Vector3D>("Vector3D")
        .field("x", &Vector3D::x)
        .field("y", &Vector3D::y)
        .field("z", &Vector3D::z)
        ;

  /* emscripten::value_object<ExportableChunk>("Chunk") */
  /*       .field("blocks", &ExportableChunk::blocks, allow_raw_pointer<int>()) */
  /*       .field("pos", &ExportableChunk::pos) */
  /*       ; */

  emscripten::value_object<Block>("Block");

  emscripten::value_array<std::array<int, CHUNK_DATA_LENGTH>>("chunkBlocks")
    .element(emscripten::index<0>())
    .element(emscripten::index<1>())
    .element(emscripten::index<2>())
    .element(emscripten::index<3>())
    ;

  emscripten::function("getChunk", &getChunk);
  emscripten::function("getChunkBlock", &getChunkBlock, allow_raw_pointer<int>());


}
