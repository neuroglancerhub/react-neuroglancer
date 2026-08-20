# Example app

Runs the component in a browser against a local build, with no npm publish step.

```bash
npm run example         # http://localhost:5173
npm run example:build   # production build, to check the whole thing bundles
```

`npm run example` builds the library first and points the app at `dist/index.js`,
so what you see is what a consumer gets. To iterate on the component itself with
HMR, run it against the source instead:

```bash
EXAMPLE_TARGET=src npm run example
```

## How it finds neuroglancer

The app imports `@janelia-flyem/react-neuroglancer`, which imports
`@janelia-flyem/neuroglancer/janelia`. The fork resolves that subpath through
its own `exports` map, straight to TypeScript source, and vite compiles it
along with everything else. `vite.config.example.js` still carries an alias for
older installs of the fork that predate the `./janelia` export; it drops out on
its own when the export is present.

Because the fork is usually a symlink to a checkout outside this repo, the
config adds its real path to `server.fs.allow`.

## Workers

Nothing to do. Neuroglancer spawns its workers with
`new Worker(new URL(..., import.meta.url))`, so vite finds them, bundles them
and emits hashed assets next to the app - `chunk_worker.bundle-<hash>.js`,
`async_computation.bundle-<hash>.js` - along with the wasm codecs.

One requirement: the chunk worker dynamically imports its codecs, so its bundle
has to be code-split, which vite's default worker format (`iife`) cannot do.
`vite.config.example.js` sets `worker.format` to `"es"`.

`example/dist/` is generated and gitignored.

## Pushing state in from the host

The `segments` row drives the segmentation layer from outside the viewer, the way
neuPrintExplorer's body-id buttons do: type a body id, then `Add` or `Remove`.

The two readouts are the test. `pushed` is what this app put into the `viewerState` prop;
`viewer reports` is what came back through `onViewerStateChanged`. They should agree within a
second of each click, in both directions. If `pushed` moves and `viewer reports` does not, the
component is dropping the update.

That is a regression worth guarding: the component decides whether to call `restoreState` by
comparing serialised state, and host applications commonly build the next state by shallow-copying
the previous one and editing a layer inside it. When that happens, both sides of the comparison
point at the same mutated layer and the update is silently skipped. `withSegments` in `main.jsx`
shows the shape a host should use - replace the layer, do not edit it.

Clicking a segment in the viewer also adds it to `viewer reports`, so you can select one there and
remove it from here to exercise the round trip without knowing a body id.

## Testing against a real app

Closest simulation of publishing:

```bash
npm pack
cd ../your-app && npm install ../react-neuroglancer/janelia-flyem-react-neuroglancer-2.5.1.tgz
```

`npm link` is a faster loop, but the linked copy resolves `react` from *this*
repo's `node_modules`, so the app needs to dedupe react/react-dom (in vite,
`resolve.dedupe`) or it will load two copies of React.
