import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import react from "@vitejs/plugin-react";

export default defineConfig({
  optimizeDeps: {
    exclude: ["@craft/engine"],
  },
  clearScreen: false,
  build: {
    commonjsOptions: {
      include: [/@craft\/engine/, /node_modules/],
    },
    // rollupOptions: {
    //   input: {
    //     index: "./index1.html",
    //     test: "./src/index2.html",
    //   },
    // },
  },
  plugins: [react(), wasm(), topLevelAwait()],
  worker: {
    format: "es",
    plugins: () => [wasm(), topLevelAwait()],
  },
});
