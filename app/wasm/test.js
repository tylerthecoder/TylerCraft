const terrainService = require("./build/terrain.js");

terrainService().then(instance => {
  console.log(Object.keys(instance).filter(k => k.includes("_")))
  console.log(instance._test());
  console.log(instance._getChunk());
});
