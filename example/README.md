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
`@janelia-flyem/neuroglancer/janelia`. Older builds of the fork have no
`./janelia` export, so `vite.config.example.js` checks the installed copy and,
when the export is missing, aliases the specifier (and its stylesheet) straight
to `dist/module/main.js` and `dist/module/main.css`. Once the fork ships the
export the alias drops out on its own.

That means the fork checkout has to have been built with `npm run build:lib-janelia`.

## Workers

`copy-neuroglancer-assets.mjs` runs before vite and copies neuroglancer's worker
bundles into `example/public/assets/`. The prebuilt neuroglancer bundle asks for
its chunk worker by a path frozen at *its* build time
(`/assets/chunk_worker.bundle-<hash>.js`), and that worker in turn loads
`./async_computation.bundle.js` as a sibling, so both have to be sitting there
under the names they are asked for. The script re-reads those names each run, so
rebuilding the fork does not break it.

`example/public/assets/` and `example/dist/` are generated; both are gitignored.

## Testing against a real app

Closest simulation of publishing:

```bash
npm pack
cd ../your-app && npm install ../react-neuroglancer/janelia-flyem-react-neuroglancer-2.5.1.tgz
```

`npm link` is a faster loop, but the linked copy resolves `react` from *this*
repo's `node_modules`, so the app needs to dedupe react/react-dom (in vite,
`resolve.dedupe`) or it will load two copies of React.
