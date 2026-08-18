/**
 * Config for the example app in example/ — a way to run the component in a
 * browser without publishing to npm.
 *
 *   npm run example        # against the built dist/, i.e. what consumers get
 *   EXAMPLE_TARGET=src npm run example   # against src/, for HMR while editing
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const neuroglancerRoot = resolve(repoRoot, "node_modules/@janelia-flyem/neuroglancer");
const neuroglancerModule = resolve(neuroglancerRoot, "dist/module");

// The "./janelia" subpath only exists in newer builds of the fork. When the
// installed copy predates it, point the example straight at the built files so
// it still runs.
const neuroglancerExports =
  JSON.parse(readFileSync(resolve(neuroglancerRoot, "package.json"), "utf8")).exports ?? {};
const janeliaAliases = neuroglancerExports["./janelia"]
  ? []
  : [
      // Longest specifier first: aliases are matched in order, by prefix.
      {
        find: "@janelia-flyem/neuroglancer/janelia/style.css",
        replacement: resolve(neuroglancerModule, "main.css"),
      },
      {
        find: "@janelia-flyem/neuroglancer/janelia",
        replacement: resolve(neuroglancerModule, "main.js"),
      },
    ];

const libraryEntry =
  process.env.EXAMPLE_TARGET === "src" ? "src/index.jsx" : "dist/index.js";

export default defineConfig({
  root: resolve(repoRoot, "example"),
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@janelia-flyem/react-neuroglancer",
        replacement: resolve(repoRoot, libraryEntry),
      },
      ...janeliaAliases,
    ],
    // The library resolves react from the repo root; keep one copy of it.
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    // Neuroglancer is a large prebuilt bundle with its own workers; let vite
    // serve it as-is rather than pre-bundling it.
    exclude: ["@janelia-flyem/neuroglancer"],
  },
  server: {
    fs: {
      // node_modules/@janelia-flyem/neuroglancer is usually a symlink to a
      // checkout outside this repo, which vite will not serve by default.
      allow: [repoRoot, realpathSync(neuroglancerRoot)],
    },
  },
  build: {
    outDir: resolve(repoRoot, "example/dist"),
    emptyOutDir: true,
  },
});
