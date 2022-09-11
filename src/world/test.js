const WASM = require("./pkg-nodejs/world")


const world = WASM.World.new_wasm();
world.load_chunk_wasm(0, 0);
console.log(world.serialize_chunk(0, 0));
console.log(world.get_block_wasm(0, 0, 0));