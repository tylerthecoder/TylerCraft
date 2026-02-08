import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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
  server: {
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "bd99-66-54-100-22.ngrok-free.app",
    ],
  },

  plugins: [tailwindcss(), react(), wasm(), topLevelAwait()],
  worker: {
    format: "es",
    plugins: () => [wasm(), topLevelAwait()],
  },
});
