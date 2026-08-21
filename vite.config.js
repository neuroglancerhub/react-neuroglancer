import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: fileURLToPath(new URL("src/index.jsx", import.meta.url)),
      formats: ["es"],
      fileName: "index",
    },
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      // Keep peer dependencies out of the bundle. The subpath patterns matter:
      // without them the automatic JSX runtime (react/jsx-runtime) gets inlined,
      // which duplicates React internals in the consuming app.
      external: [
        /^react($|\/)/,
        /^react-dom($|\/)/,
        /^prop-types($|\/)/,
        /^@janelia-flyem\/neuroglancer($|\/)/,
      ],
    },
  },
  test: {
    environment: "jsdom",
    // The real neuroglancer entry needs WebGL and web workers, so tests run
    // against a fake viewer instead.
    alias: {
      "@janelia-flyem/neuroglancer/janelia": fileURLToPath(
        new URL("test/stubs/neuroglancer-janelia.js", import.meta.url),
      ),
    },
  },
});
