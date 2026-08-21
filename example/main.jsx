import React, { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import Neuroglancer, {
  getNeuroglancerViewerState,
} from "@janelia-flyem/react-neuroglancer";
import "@janelia-flyem/neuroglancer/janelia/style.css";
import "./example.css";

const SEGMENTATION_LAYER = "segmentation";

const INITIAL_VIEWER_STATE = {
  // An array of named layers, which is the shape neuroglancer itself reports
  // from toJSON() and the shape host applications build their updates around.
  layers: [
    {
      name: "grayscale",
      type: "image",
      source:
        "dvid://https://flyem.dvid.io/ab6e610d4fe140aba0e030645a1d7229/grayscalejpeg",
    },
    {
      name: SEGMENTATION_LAYER,
      type: "segmentation",
      source:
        "dvid://https://flyem.dvid.io/d925633ed0974da78e2bb5cf38d01f4d/segmentation",
    },
    {
      // Somewhere to draw annotations without needing a backing service, so the
      // annotation tools are usable as soon as the example loads.
      //
      // The dimensions are given explicitly: a bare "local://annotations" source
      // takes its transform from the global coordinate space, which is still
      // empty while the dvid layers above are loading, and annotations drawn into
      // a layer created that early never render.
      name: "annotations",
      type: "annotation",
      source: {
        url: "local://annotations",
        transform: {
          outputDimensions: {
            x: [8e-9, "m"],
            y: [8e-9, "m"],
            z: [8e-9, "m"],
          },
        },
      },
      tool: "annotatePoint",
    },
  ],
  selectedLayer: { layer: "annotations", visible: true },
  navigation: { zoomFactor: 8 },
};

// Reading and updating the segmentation layer's segment list the way a host
// application does. The update replaces the layer rather than editing it in
// place: the component decides whether to push state into the viewer by
// comparing serialised state, so an in-place edit is invisible to it.
function segmentsOf(state) {
  const layer = (state.layers ?? []).find((l) => l.name === SEGMENTATION_LAYER);
  return layer?.segments ?? [];
}

function withSegments(state, segments) {
  return {
    ...state,
    layers: state.layers.map((layer) =>
      layer.name === SEGMENTATION_LAYER ? { ...layer, segments } : layer
    ),
  };
}

// Middle of the dvid volume above, whose extent is 15167 x 14143 x 8895.
const SAMPLE_POSITION = [7583, 7071, 4447];

function Example() {
  const [viewerState, setViewerState] = useState(INITIAL_VIEWER_STATE);
  // Kept separate from viewerState: feeding the viewer's own reports back in as
  // a prop would fight with the user's interactions.
  const [reportedPosition, setReportedPosition] = useState(null);
  const [changeCount, setChangeCount] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [segmentId, setSegmentId] = useState("265452124");
  const [reportedSegments, setReportedSegments] = useState([]);

  const onViewerStateChanged = useCallback((state) => {
    setReportedPosition(state.position ?? null);
    setReportedSegments(segmentsOf(state));
    setChangeCount((count) => count + 1);
  }, []);

  const addSegment = useCallback((id) => {
    setViewerState((prev) => {
      const current = segmentsOf(prev);
      if (!id || current.includes(id)) {
        return prev;
      }
      const segments = [...current, id].sort((a, b) => a.localeCompare(b));
      return withSegments(prev, segments);
    });
  }, []);

  const removeSegment = useCallback((id) => {
    setViewerState((prev) => {
      const current = segmentsOf(prev);
      if (!current.includes(id)) {
        return prev;
      }
      return withSegments(prev, current.filter((segment) => segment !== id));
    });
  }, []);

  const pushedSegments = segmentsOf(viewerState);

  const onSelectedChanged = useCallback((segment) => {
    setSelectedSegment(segment === null ? null : String(segment));
  }, []);

  return (
    <div className="example">
      <header className="example-controls">
        <strong>react-neuroglancer</strong>
        <button type="button" onClick={() => setViewerState({ ...INITIAL_VIEWER_STATE, position: SAMPLE_POSITION })}>
          Jump to sample position
        </button>
        <button type="button" onClick={() => setViewerState({ ...INITIAL_VIEWER_STATE, position: [] })}>
          Reset position
        </button>
        <button type="button" onClick={() => console.log(getNeuroglancerViewerState())}>
          Log viewer state
        </button>
        <span className="example-readout">
          position: 
          {' '}
          {reportedPosition ? reportedPosition.map((n) => Math.round(n)).join(", ") : "—"}
          {" · "}
          hovered segment: 
          {' '}
          {selectedSegment ?? "—"}
          {" · "}
          state changes: 
          {' '}
          {changeCount}
        </span>
      </header>
      <header className="example-controls">
        <strong>segments</strong>
        <input
          type="text"
          value={segmentId}
          onChange={(event) => setSegmentId(event.target.value.trim())}
          placeholder="body id"
          aria-label="body id"
        />
        <button type="button" onClick={() => addSegment(segmentId)}>
          Add
        </button>
        <button type="button" onClick={() => removeSegment(segmentId)}>
          Remove
        </button>
        <span className="example-readout">
          pushed: 
          {' '}
          {pushedSegments.length ? pushedSegments.join(", ") : "—"}
          {" · "}
          viewer reports: 
          {' '}
          {reportedSegments.length ? reportedSegments.join(", ") : "—"}
        </span>
      </header>
      <div className="example-viewer">
        <Neuroglancer
          perspectiveZoom={80}
          viewerState={viewerState}
          ngServer="https://clio-ng.janelia.org"
          onViewerStateChanged={onViewerStateChanged}
          onSelectedChanged={onSelectedChanged}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Example />);
