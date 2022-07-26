import WorldWasm from "@craft/world"


export let World: typeof WorldWasm;

export async function LoadModules() {
	const worldPromise = (WorldWasm as unknown as Promise<typeof WorldWasm>)
		.then(
			data => World = data
		)

	await worldPromise;

	console.log("Modules Loaded", World);
}
