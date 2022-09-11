import WorldWasm from "@craft/rust-world"

export let WasmWorld: typeof WorldWasm;

export * as WorldModuleTypes from "@craft/rust-world";

export async function LoadModules() {
	const wasm = WorldWasm as any;

	if (wasm.default?.then) {
		(wasm as { default: Promise<typeof WorldWasm> }).default.then(
			data => WasmWorld = data
		).then(
			() => console.log("Modules Loaded ES6", WasmWorld)
		)
	} else {
    // It may or may not be a promise
		WasmWorld = await wasm
		console.log("Modules Loaded node", WasmWorld)
	}
}


