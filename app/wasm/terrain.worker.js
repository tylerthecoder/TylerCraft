var terrainService = require("./build/terrain2.js");
var terrainServiceInstance;
// declare var onmessage: (e: IWorkerMessage) => void;
// declare var postMessage: (e: IWorkerResponse) => void;
onmessage = function (e) {
    console.log("Recived message");
    var blocks = getChunk(e.data.x, e.data.y);
    postMessage({
        data: blocks
    }, null);
};
terrainService().then(function (instance) {
    terrainServiceInstance = instance;
});
var CHUNK_DATA_LENGTH = 16 * 16 * 64;
var getChunk = function (x, y) {
    var chunkPtr = terrainServiceInstance._getChunkBlocks(2, 3);
    console.log(chunkPtr);
    var blocksArray = new Uint8Array(new ArrayBuffer(CHUNK_DATA_LENGTH));
    for (var i = 0; i < CHUNK_DATA_LENGTH; i++) {
        var block = terrainServiceInstance.HEAP8[chunkPtr + i];
        blocksArray[i] = block;
        if (block != 0) {
            console.log(block, i);
        }
    }
    return blocksArray;
};
