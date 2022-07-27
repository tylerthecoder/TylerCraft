console.log("Bootstrapping")

import * as Engine from "@craft/engine"

console.log("Boot Engine", Engine);

import("@craft/engine").then(
	eng => console.log("Engine Importer", eng)
)

import("./app")
	.then(app => console.log("App imported"))
	.catch(e => console.error("Error importing app.ts", e))