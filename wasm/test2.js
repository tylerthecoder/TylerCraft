const terrainService = require("./build/terrain2.js");

const CHUNK_DATA_LENGTH = 16 * 16 * 64;

terrainService().then(instance => {
  console.log(instance);
  console.log(Object.keys(instance).filter(x => x.includes("_")));
  console.log(instance._hello());
  const chunkPtr = instance._getChunkBlocks(2, 3);
  console.log(chunkPtr);

  for (let i = 0; i < CHUNK_DATA_LENGTH; i++) {
    const block = instance.HEAP8[chunkPtr + i];
    if (block != 0) {
      console.log(block, i);
    }
  }

});


// const start = () => {
//   console.log("Starting");
//   const code = fetch("build/terrain2.wasm");
//   console.log(code);

// WebAssembly.instantiateStreaming(code, ({module, instance}) => {

//   console.log(instance);

//   instance.exports._hello();

//   // Module.ccall("_hello", 

// });

// }
