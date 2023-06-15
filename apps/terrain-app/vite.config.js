import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  optimizeDeps: {
    exclude: ["@craft/engine"],
  },
  clearScreen: false,
  server: {
    port: 4000,
  },
  build: {
    target: "esnext",
    commonjsOptions: {
      include: [/@craft\/engine/, /node_modules/],
    },
  },
  plugins: [wasm(), topLevelAwait()],
});
