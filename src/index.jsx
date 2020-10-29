import { setupDefaultViewer } from "@janelia-flyem/neuroglancer";
import React from "react";
import PropTypes from "prop-types";
import { SegmentationUserLayer } from "@janelia-flyem/neuroglancer/dist/module/neuroglancer/segmentation_user_layer";

const viewersKeyed = {};
let viewerNoKey;

export function getNeuroglancerViewerState(key) {
  const v = key ? viewersKeyed[key] : viewerNoKey;
  return v ? v.state.toJSON() : {};
}

export default class Neuroglancer extends React.Component {
  constructor(props) {
    super(props);
    this.ngContainer = React.createRef();
    this.viewer = null;
  }

  componentDidMount() {
    const {
      perspectiveZoom,
      viewerState,
      brainMapsClientId,
      eventBindingsToUpdate,
      callbacks,
      key
    } = this.props;
    this.viewer = setupDefaultViewer({
      brainMapsClientId,
      target: this.ngContainer.current,
      bundleRoot: "/"
    });

    this.setCallbacks(callbacks);

    if (eventBindingsToUpdate) {
      this.updateEventBindings(eventBindingsToUpdate);
    }

    this.viewer.layerManager.layersChanged.add(this.layersChanged);

    if (viewerState) {
      this.viewer.state.restoreState(viewerState);
    } else {
      this.viewer.state.restoreState({
        layers: {
          grayscale: {
            type: "image",
            source:
              "dvid://https://flyem.dvid.io/ab6e610d4fe140aba0e030645a1d7229/grayscalejpeg"
          },
          segmentation: {
            type: "segmentation",
            source:
              "dvid://https://flyem.dvid.io/d925633ed0974da78e2bb5cf38d01f4d/segmentation"
          }
        },
        perspectiveZoom,
        navigation: {
          zoomFactor: 8
        }
      });
    }

    // Make the Neuroglancer viewer accessible from getNeuroglancerViewerState().
    // That function can be used to synchronize an external Redux store with any
    // state changes made internally by the viewer.
    if (key) {
      viewersKeyed[key] = this.viewer;
    } else {
      viewerNoKey = this.viewer;
    }

    // TODO: This is purely for debugging and we need to remove it.
    window.viewer = this.viewer;
  }

  componentDidUpdate() {
    // The restoreState() call clears the "selected" (hovered on) segment, which is needed
    // by Neuroglancer's code to toggle segment visibilty on a mouse click.  To free the user
    // from having to move the mouse before clicking, save the selected segment and restore
    // it after restoreState().
    let selectedSegments = {};
    for (let layer of this.viewer.layerManager.managedLayers) {
      if (layer.layer instanceof SegmentationUserLayer) {
        const { segmentSelectionState } = layer.layer.displayState;
        selectedSegments[layer.name] = segmentSelectionState.selectedSegment;
      }
    }

    const { viewerState } = this.props;
    if (viewerState) {
      this.viewer.state.restoreState(viewerState);
    }

    for (let layer of this.viewer.layerManager.managedLayers) {
      if (layer.layer instanceof SegmentationUserLayer) {
        const { segmentSelectionState } = layer.layer.displayState;
        segmentSelectionState.set(selectedSegments[layer.name]);
      }
    }

    // For some reason setting position to an empty array doesn't reset
    // the position in the viewer. This should handle those cases by looking
    // for the empty position array and calling the position reset function if
    // found.
    if ('position' in viewerState) {
      if (Array.isArray(viewerState.position)) {
        if (viewerState.position.length === 0) {
          this.viewer.position.reset();
        }
      }
    }
  }

  componentWillUnmount() {
    const { key } = this.props;
    if (key) {
      delete viewersKeyed[key];
    } else {
      viewerNoKey = undefined;
    }
  }

  /* setCallbacks allows us to set a callback on a neuroglancer event
   * each callback created should be in the format:
   * [
   *   {
   *     name: 'unique-name',
   *     event: 'the neuroglancer event to target, eg: click0, keyt',
   *     function: (slice) => { slice.whatever }
   *   },
   *   {...}
   * ]
   *
   */
  setCallbacks(callbacks) {
    callbacks.forEach(callback => {
      this.viewer.bindCallback(callback.name, callback.function)
      this.viewer.inputEventBindings.sliceView.set(callback.event, callback.name)
    });
  }

  updateEventBindings = eventBindingsToUpdate => {
    const root = this.viewer.inputEventBindings;

    const traverse = current => {
      const replace = (eaMap, event0, event1) => {
        const action = eaMap.get(event0);
        if (action) {
          eaMap.delete(event0);
          if (event1) {
            eaMap.set(event1, action);
          }
        }
      };

      const eventActionMap = current.bindings;
      eventBindingsToUpdate.forEach(oldNewBinding => {
        const eventOldBase = Array.isArray(oldNewBinding)
          ? oldNewBinding[0]
          : oldNewBinding;

        const eventOldA = `at:${eventOldBase}`;
        const eventNewA = oldNewBinding[1]
          ? `at:${oldNewBinding[1]}`
          : undefined;
        replace(eventActionMap, eventOldA, eventNewA);

        const eventOldB = `bubble:${eventOldBase}`;
        const eventNewB = oldNewBinding[1]
          ? `bubble:${oldNewBinding[1]}`
          : undefined;
        replace(eventActionMap, eventOldB, eventNewB);
      });

      current.parents.forEach(parent => {
        traverse(parent);
      });
    };

    traverse(root.global);
    traverse(root.perspectiveView);
    traverse(root.sliceView);
  };

  layersChanged = () => {
    if (this.handlerRemovers) {
      // If change handlers have been added already, call the function to remove each one,
      // so there won't be duplicates when new handlers are added below.
      this.handlerRemovers.forEach(remover => remover());
    }

    if (this.viewer) {
      const { onSelectedChanged, onVisibleChanged } = this.props;
      if (onSelectedChanged || onVisibleChanged) {
        this.handlerRemovers = [];

        for (let layer of this.viewer.layerManager.managedLayers) {
          if (layer.layer instanceof SegmentationUserLayer) {
            const {
              segmentSelectionState,
              visibleSegments
            } = layer.layer.displayState;

            if (segmentSelectionState && onSelectedChanged) {
              // Bind the layer so it will be an argument to the handler when called.
              const selectedChanged = this.selectedChanged.bind(
                undefined,
                layer
              );
              const remover = segmentSelectionState.changed.add(
                selectedChanged
              );
              this.handlerRemovers.push(remover);
              layer.registerDisposer(remover);
            }

            if (visibleSegments && onVisibleChanged) {
              const visibleChanged = this.visibleChanged.bind(undefined, layer);
              const remover = visibleSegments.changed.add(visibleChanged);
              this.handlerRemovers.push(remover);
              layer.registerDisposer(remover);
            }
          }
        }
      }
    }
  };

  selectedChanged = layer => {
    if (this.viewer) {
      const { onSelectedChanged } = this.props;
      if (onSelectedChanged) {
        const { segmentSelectionState } = layer.layer.displayState;
        if (segmentSelectionState) {
          const segment = segmentSelectionState.hasSelectedSegment
            ? segmentSelectionState.selectedSegment
            : null;
          onSelectedChanged(segment, layer);
        }
      }
    }
  };

  visibleChanged = layer => {
    if (this.viewer) {
      const { onVisibleChanged } = this.props;
      if (onVisibleChanged) {
        const { visibleSegments } = layer.layer.displayState;
        if (visibleSegments) {
          onVisibleChanged(visibleSegments, layer);
        }
      }
    }
  };

  render() {
    const { perspectiveZoom } = this.props;
    return (
      <div className="neuroglancer-container" ref={this.ngContainer}>
        <p>Neuroglancer here with zoom {perspectiveZoom}</p>
      </div>
    );
  }
}

Neuroglancer.propTypes = {
  perspectiveZoom: PropTypes.number,
  viewerState: PropTypes.object,
  brainMapsClientId: PropTypes.string,
  key: PropTypes.string,

  /**
   * An array of event bindings to change in Neuroglancer.  The array format is as follows:
   * [[old-event1, new-event1], [old-event2], old-event3]
   * Here, `old-event1`'s will be unbound and its action will be re-bound to `new-event1`.
   * The bindings for `old-event2` and `old-event3` will be removed.
   * Neuroglancer has its own syntax for event descriptors, and here are some examples:
   * 'keya', 'shift+keyb' 'control+keyc', 'digit4', 'space', 'arrowleft', 'comma', 'period',
   * 'minus', 'equal', 'bracketleft'.
   */
  eventBindingsToUpdate: PropTypes.array,

  /**
   * A function of the form `(segment, layer) => {}`, called each time there is a change to
   * the segment the user has "selected" (i.e., hovered over) in Neuroglancer.
   * The `segment` argument will be a Neuroglancer `Uint64` with the ID of the now-selected
   * segment, or `null` if no segment is now selected.
   * The `layer` argument will be a Neuroglaner `ManagedUserLayer`, whose `layer` property
   * will be a Neuroglancer `SegmentationUserLayer`.
   */
  onSelectedChanged: PropTypes.func,

  /**
   * A function of the form `(segments, layer) => {}`, called each time there is a change to
   * the segments the user has designated as "visible" (i.e., double-clicked on) in Neuroglancer.
   * The `segments` argument will be a Neuroglancer `Uint64Set` whose elements are `Uint64`
   * instances for the IDs of the now-visible segments.
   * The `layer` argument will be a Neuroglaner `ManagedUserLayer`, whose `layer` property
   * will be a Neuroglancer `SegmentationUserLayer`.
   */
  onVisibleChanged: PropTypes.func,
  callbacks: PropTypes.arrayOf(PropTypes.object)
};

Neuroglancer.defaultProps = {
  perspectiveZoom: 20,
  eventBindingsToUpdate: null,
  brainMapsClientId: null,
  viewerState: null,
  onSelectedChanged: null,
  onVisibleChanged: null,
  key: null,
  callbacks: []
};
