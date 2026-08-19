import React, { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import Neuroglancer, {
  getNeuroglancerViewerState,
} from "@janelia-flyem/react-neuroglancer";
import "@janelia-flyem/neuroglancer/janelia/style.css";
import "./example.css";

const INITIAL_VIEWER_STATE = {
  layers: {
    grayscale: {
      type: "image",
      source:
        "dvid://https://flyem.dvid.io/ab6e610d4fe140aba0e030645a1d7229/grayscalejpeg",
    },
    segmentation: {
      type: "segmentation",
      source:
        "dvid://https://flyem.dvid.io/d925633ed0974da78e2bb5cf38d01f4d/segmentation",
    },
    // Somewhere to draw annotations without needing a backing service, so the
    // annotation tools are usable as soon as the example loads.
    //
    // The dimensions are given explicitly: a bare "local://annotations" source
    // takes its transform from the global coordinate space, which is still
    // empty while the dvid layers above are loading, and annotations drawn into
    // a layer created that early never render.
    annotations: {
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
  },
  selectedLayer: { layer: "annotations", visible: true },
  navigation: { zoomFactor: 8 },
};

const SAMPLE_POSITION = [23458, 22355, 20047];

function Example() {
  const [viewerState, setViewerState] = useState(INITIAL_VIEWER_STATE);
  // Kept separate from viewerState: feeding the viewer's own reports back in as
  // a prop would fight with the user's interactions.
  const [reportedPosition, setReportedPosition] = useState(null);
  const [changeCount, setChangeCount] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState(null);

  const onViewerStateChanged = useCallback((state) => {
    setReportedPosition(state.position ?? null);
    setChangeCount((count) => count + 1);
  }, []);

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
          position: {reportedPosition ? reportedPosition.map((n) => Math.round(n)).join(", ") : "—"}
          {" · "}
          hovered segment: {selectedSegment ?? "—"}
          {" · "}
          state changes: {changeCount}
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
