import * as WorldWasm from "@craft/rust-world"

export let World: typeof WorldWasm;

export async function LoadModules() {
	const wasm = WorldWasm as any;

	if (wasm.default?.then) {
		(wasm as { default: Promise<typeof WorldWasm> }).default.then(
			data => World = data
		).then(
			() => console.log("Modules Loaded ES6", World)
		)
	} else {
		World = wasm
		console.log("Modules Loaded node", World)
	}

}
