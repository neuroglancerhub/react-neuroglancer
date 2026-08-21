/**
 * Config for the example app in example/ — a way to run the component in a
 * browser without publishing to npm.
 *
 *   npm run example        # against the built dist/, i.e. what consumers get
 *   EXAMPLE_TARGET=src npm run example   # against src/, for HMR while editing
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join, relative, resolve } from "node:path";
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

// Vite finds the dependencies to pre-bundle by crawling the app's entry
// points, but neuroglancer is excluded from that step below, so the crawl
// stops at its door and its own dependencies are served raw. CommonJS ones
// then fail in the browser: codemirror has no ESM default export, so the
// shader widget dies with "does not provide an export named 'default'".
// Naming neuroglancer's bundle entry points here lets vite reach them anyway.
// This mirrors the consumer config in neuroglancer's examples/vite.
const neuroglancerEntryDir = ["lib", "src"]
  .map((dir) => resolve(neuroglancerRoot, dir))
  .find((dir) => existsSync(join(dir, "chunk_worker.bundle.js")));

const exampleRoot = resolve(repoRoot, "example");
const neuroglancerEntries = neuroglancerEntryDir
  ? ["main", "async_computation", "chunk_worker"].map((name) =>
      // Entries are resolved against the vite root, which is example/.
      relative(exampleRoot, join(neuroglancerEntryDir, `${name}.bundle.js`)),
    )
  : [];

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
    entries: ["index.html", ...neuroglancerEntries],
    // Neuroglancer refers to its workers with `new URL`, which esbuild cannot
    // rewrite, so it must not be pre-bundled itself.
    exclude: ["@janelia-flyem/neuroglancer"],
  },
  esbuild: {
    // Neuroglancer's TypeScript sources use decorators, which need es2022.
    // Only matters when the package is linked to a checkout that ships src/.
    target: "es2022",
  },
  server: {
    fs: {
      // node_modules/@janelia-flyem/neuroglancer is usually a symlink to a
      // checkout outside this repo, which vite will not serve by default.
      allow: [repoRoot, realpathSync(neuroglancerRoot)],
    },
  },
  // Neuroglancer's chunk worker dynamically imports its codecs, so the worker
  // bundle has to be code-split. Vite's default worker format, iife, cannot do
  // that.
  worker: {
    format: "es",
  },
  build: {
    outDir: resolve(repoRoot, "example/dist"),
    emptyOutDir: true,
  },
});
