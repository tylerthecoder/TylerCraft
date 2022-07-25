const { wasmLoader } = require("esbuild-plugin-wasm")

console.log(wasmLoader)

console.log("Here we go")
// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
require("esbuild").build({
	entryPoints: ["app.ts"],
	bundle: true,
	outfile: "main.js",
	loader: {
		".glsl": "text"
	},
	plugins: [
		wasmLoader(),
	]
}).catch(() => process.exit(1))