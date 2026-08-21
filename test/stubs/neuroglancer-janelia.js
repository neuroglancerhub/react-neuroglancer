/**
 * Stand-in for "@janelia-flyem/neuroglancer/janelia", aliased in for tests by
 * vite.config.js. The real entry pulls in the whole viewer (WebGL, workers),
 * which jsdom cannot run, so the tests drive this fake instead and assert on
 * what the wrapper asks the viewer to do.
 */

function makeSignal() {
  const handlers = [];
  return {
    add(handler) {
      handlers.push(handler);
      return () => {
        const index = handlers.indexOf(handler);
        if (index >= 0) {
          handlers.splice(index, 1);
        }
      };
    },
    dispatch(...args) {
      handlers.slice().forEach((handler) => handler(...args));
    },
  };
}

// Records what the wrapper did, so tests can assert on it. Reset between tests.
export const viewerCalls = {
  setupOptions: [],
  restoredStates: [],
  disposeCount: 0,
};

export function resetViewerCalls() {
  viewerCalls.setupOptions = [];
  viewerCalls.restoredStates = [];
  viewerCalls.disposeCount = 0;
}

export class SegmentationUserLayer {}
export class AnnotationUserLayer {}

export const parseUint64 = (idStr) => BigInt(idStr);
export const urlSafeParse = (str) => JSON.parse(str);
export const encodeFragment = (str) => encodeURI(str);
export const getObjectColor = () => [0.5, 0.5, 0.5, 1];
export const serializeColor = () => '#808080';

export function setupMinimalViewer(options) {
  viewerCalls.setupOptions.push(options);
  const makeEventBindings = () => ({ bindings: new Map(), parents: [] });

  return {
    state: {
      changed: makeSignal(),
      viewer: { position: [1, 2, 3] },
      restoreState(state) {
        viewerCalls.restoredStates.push(state);
      },
      toJSON() {
        // Segment ids come back from the real viewer as BigInt.
        return { position: [1, 2, 3], selectedSegment: 12345678901234567890n };
      },
    },
    layerManager: { layersChanged: makeSignal(), managedLayers: [] },
    inputEventBindings: {
      global: makeEventBindings(),
      perspectiveView: makeEventBindings(),
      sliceView: makeEventBindings(),
    },
    selectionDetailsState: { changed: makeSignal(), value: undefined },
    position: { reset() {} },
    projectionScale: { reset() {} },
    bindCallback() {},
    dispose() {
      viewerCalls.disposeCount += 1;
    },
  };
}
