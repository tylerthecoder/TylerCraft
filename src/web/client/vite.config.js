import { defineConfig } from "vite"
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
	optimizeDeps: {
		exclude: ['@craft/engine'],
	},
	build: {
		commonjsOptions: {
			include: [/@craft\/engine/, /node_modules/],
		},
	},
	plugins: [
		wasm(),
		topLevelAwait()
	]
})