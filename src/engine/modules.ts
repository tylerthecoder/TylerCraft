import * as WorldWasm from "@craft/rust-world"

export let WasmWorld: typeof WorldWasm;


export async function LoadModules() {
	const wasm = WorldWasm as any;

	if (wasm.default?.then) {
		(wasm as { default: Promise<typeof WorldWasm> }).default.then(
			data => WasmWorld = data
		).then(
			() => console.log("Modules Loaded ES6", WasmWorld)
		)
	} else {
		WasmWorld = wasm
		console.log("Modules Loaded node", WasmWorld)
	}

}
