/**
 * Copies neuroglancer's worker bundles into example/public/assets/.
 *
 * The prebuilt janelia bundle refers to its workers by a path that is frozen at
 * *its* build time, e.g. new Worker(new URL("/assets/chunk_worker.bundle-<hash>.js", ...)).
 * Vite resolves those references when it builds the example, so the files have
 * to exist under that exact name. This scans the bundle for the names it wants
 * and copies the matching worker bundles into place, which keeps working when
 * the fork is rebuilt and the hash changes. Every *.bundle.js is copied under
 * its plain name too, because the workers spawn each other by relative URL.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const neuroglancerDist = resolve(
  repoRoot,
  "node_modules/@janelia-flyem/neuroglancer/dist/module",
);
const bundlePath = join(neuroglancerDist, "main.js");
const targetDir = resolve(repoRoot, "example/public/assets");

function fail(message) {
  console.error(`copy-neuroglancer-assets: ${message}`);
  process.exit(1);
}

if (!existsSync(bundlePath)) {
  fail(
    `${bundlePath} not found.\n` +
      "  The example needs the janelia library build of the neuroglancer fork.\n" +
      "  Build it there with: npm run build:lib-janelia",
  );
}

// e.g. "/assets/chunk_worker.bundle-Drp-6t9j.js" or "/assets/async_computation.bundle.js"
const referenced = [
  ...new Set(readFileSync(bundlePath, "utf8").match(/\/assets\/[\w.-]+\.js/g) ?? []),
];

mkdirSync(targetDir, { recursive: true });

const workerBundles = readdirSync(neuroglancerDist).filter((name) =>
  name.endsWith(".bundle.js"),
);

if (workerBundles.length === 0) {
  fail(`no *.bundle.js worker files in ${neuroglancerDist}`);
}

// chunk_worker.bundle.js spawns async_computation.bundle.js as a sibling.
for (const name of workerBundles) {
  copyFileSync(join(neuroglancerDist, name), join(targetDir, name));
  console.log(`copy-neuroglancer-assets: ${name} -> example/public/assets/${name}`);
}

for (const reference of referenced) {
  const name = reference.slice("/assets/".length);
  // Prefer an exact match, then fall back to the unhashed name the fork ships.
  const candidates = [name, name.replace(/-[A-Za-z0-9_-]{6,}\.js$/, ".js")];
  const source = candidates.map((c) => join(neuroglancerDist, c)).find(existsSync);

  if (!source) {
    fail(`no source found for ${reference} (tried ${candidates.join(", ")})`);
  }

  if (workerBundles.includes(name)) {
    continue; // already copied under its plain name
  }

  copyFileSync(source, join(targetDir, name));
  console.log(`copy-neuroglancer-assets: ${basename(source)} -> example/public/assets/${name}`);
}
