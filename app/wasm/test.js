const terrainService = require("./build/terrain.js");

terrainService().then(instance => {
  console.log(instance);
  console.log(instance.getChunkBlock(2, 3));


});
