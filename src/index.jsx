import React from "react";
import PropTypes from "prop-types";
import { AnnotationUserLayer } from "@janelia-flyem/neuroglancer/dist/module/neuroglancer/annotation/user_layer";
import { getObjectColor } from "@janelia-flyem/neuroglancer/dist/module/neuroglancer/segmentation_display_state/frontend";
import { SegmentationUserLayer } from "@janelia-flyem/neuroglancer/dist/module/neuroglancer/segmentation_user_layer";
import { serializeColor } from "@janelia-flyem/neuroglancer/dist/module/neuroglancer/util/color";
import { setupDefaultViewer } from "@janelia-flyem/neuroglancer";
import { Uint64 } from "@janelia-flyem/neuroglancer/dist/module/neuroglancer/util/uint64";
import { urlSafeParse } from "@janelia-flyem/neuroglancer/dist/module/neuroglancer/util/json";
import { encodeFragment } from '@janelia-flyem/neuroglancer/dist/module/neuroglancer/ui/url_hash_binding';

const viewersKeyed = {};
let viewerNoKey;

// Adopted from neuroglancer/ui/url_hash_binding.ts
export function parseUrlHash(url) {
  let state = null;

  let s = url.replace(/^[^#]+/, '');
  if (s === '' || s === '#' || s === '#!') {
    s = '#!{}';
  }

  if (s.startsWith('#!+')) {
    s = s.slice(3);
    // Firefox always %-encodes the URL even if it is not typed that way.
    s = decodeURIComponent(s);
    state = urlSafeParse(s);
  } else if (s.startsWith('#!')) {
    s = s.slice(2);
    s = decodeURIComponent(s);
    state = urlSafeParse(s);
  } else {
    throw new Error(`URL hash is expected to be of the form "#!{...}" or "#!+{...}".`);
  }

  return state;
}

export function getNeuroglancerViewerState(key) {
  const v = key ? viewersKeyed[key] : viewerNoKey;
  return v ? v.state.toJSON() : {};
}

export function getNeuroglancerColor(idStr, key) {
  try {
    const id = Uint64.parseString(idStr);
    const v = key ? viewersKeyed[key] : viewerNoKey;
    if (v) {
      // eslint-disable-next-line no-restricted-syntax
      for (const layer of v.layerManager.managedLayers) {
        if (layer.layer instanceof SegmentationUserLayer) {
          const { displayState } = layer.layer;
          const colorVec = getObjectColor(displayState, id);

          // To get the true color, undo how getObjectColor() indicates hovering.
          if (displayState.segmentSelectionState.isSelected(id)) {
            for (let i = 0; i < 3; i += 1) {
              colorVec[i] = (colorVec[i] - 0.5) / 0.5;
            }
          }

          const colorStr = serializeColor(colorVec);
          return colorStr;
        }
      }
    }
  } catch {
    // suppress eslint no-empty
  }
  return '';
}

export function closeSelectionTab(key) {
  const v = key ? viewersKeyed[key] : viewerNoKey;
  if (v && v.closeSelectionTab) {
    v.closeSelectionTab();
  }
}

export function getLayerManager(key) {
  const v = key ? viewersKeyed[key] : viewerNoKey;
  if (v) {
    return v.layerManager;
  }
  return undefined;
}

export function getManagedLayer(key, name) {
  const layerManager = getLayerManager(key);
  if (layerManager) {
    return layerManager.managedLayers.filter(layer => layer.name === name)[0];
  }
  return undefined;
}

export function getAnnotationLayer(key, name) {
  const layer = getManagedLayer(key, name);
  if (layer && layer.layer instanceof AnnotationUserLayer) {
    return layer.layer;
  }
  return undefined;
}

export function getAnnotationSource(key, name) {
  const layer = getAnnotationLayer(key, name);
  /* eslint-disable-next-line no-underscore-dangle */
  if (layer && layer.dataSources && layer.dataSources[0].loadState_) {
    /* eslint-disable-next-line no-underscore-dangle */
    const { dataSource } = layer.dataSources[0].loadState_;
    if (dataSource) {
      return dataSource.subsources[0].subsource.annotation;
    }
  }
  return undefined;
}

export function addLayerSignalRemover(key, name, remover) {
  const layerManager = getLayerManager(key);
  if (layerManager && name && remover) {
    if (!layerManager.customSignalHandlerRemovers) {
      layerManager.customSignalHandlerRemovers = {};
    }
    if (!layerManager.customSignalHandlerRemovers[name]) {
      layerManager.customSignalHandlerRemovers[name] = [];
    }

    layerManager.customSignalHandlerRemovers[name].push(remover);
  }
}

export function unsubscribeLayersChangedSignals(layerManager, signalKey) {
  if (layerManager) {
    if (layerManager.customSignalHandlerRemovers) {
      if (layerManager.customSignalHandlerRemovers[signalKey]) {
        layerManager.customSignalHandlerRemovers[signalKey].forEach(remover => {
          remover();
        });
        delete layerManager.customSignalHandlerRemovers[signalKey];
      }
    }
  }
}

export function configureLayersChangedSignals(key, layerConfig) {
  const layerManager = getLayerManager(key);
  if (layerManager) {
    const { layerName } = layerConfig;
    unsubscribeLayersChangedSignals(layerManager, layerName);
    if (layerConfig.process) {
      const recordRemover = (remover) => addLayerSignalRemover(undefined, layerName, remover);
      recordRemover(
        layerManager.layersChanged.add(() => {
          const layer = getManagedLayer(undefined, layerName);
          if (layer) {
            layerConfig.process(layer);
          }
        }));
      const layer = getManagedLayer(undefined, layerName);
      if (layer) {
        layerConfig.process(layer);
      }

      return () =>  {
        if (layerConfig.cancel) {
          layerConfig.cancel();
        }
        unsubscribeLayersChangedSignals(layerManager, layerName);
      }
    }
  }
  return layerConfig.cancel;
}

function configureAnnotationSource(source, props, recordRemover) {
  if (source && !source.signalReady) {
    if (props.onAnnotationAdded) {
      recordRemover(source.childAdded.add((annotation) => {
        props.onAnnotationAdded(annotation);
      }));
    }
    if (props.onAnnotationDeleted) {
      recordRemover(source.childDeleted.add((id) => {
        props.onAnnotationDeleted(id);
      }));
    }
    if (props.onAnnotationUpdated) {
      recordRemover(source.childUpdated.add((annotation => {
        props.onAnnotationUpdated(annotation);
      })));
    }
    if (props.onAnnotationChanged && source.referencesChanged) {
      recordRemover(source.referencesChanged.add(props.onAnnotationChanged));
    }

    source.signalReady = true;
    recordRemover(() => {
      source.signalReady = false;
    });
  }
}

function getLoadedDataSource(layer) {
  /* eslint-disable-next-line no-underscore-dangle */
  if (layer.dataSources && layer.dataSources.length > 0 && layer.dataSources[0].loadState_ && layer.dataSources[0].loadState_.dataSource) {
    /* eslint-disable-next-line no-underscore-dangle */
    return layer.dataSources[0].loadState_.dataSource;
  }
}

function getAnnotationSourceFromLayer(layer) {
  const dataSource = getLoadedDataSource(layer);
  if (dataSource) {
    return dataSource.subsources[0].subsource.annotation;
  }
}

function configureAnnotationSourceChange(annotationLayer, props, recordRemover) {
  const configure = () => {
    const source = getAnnotationSourceFromLayer(annotationLayer);
    if (source) {
      configureAnnotationSource(source, props, recordRemover);
    }
  }

  const sourceChanged = annotationLayer.dataSourcesChanged;
  if (sourceChanged && !sourceChanged.signalReady) {
    recordRemover(sourceChanged.add(configure));
    sourceChanged.signalReady = true;
    recordRemover(() => {
      sourceChanged.signalReady = false;
    });
    configure();
  }
}

export function configureAnnotationLayer(layer, props, recordRemover) {
  if (layer) {
    layer.expectingExternalTable = true;
    if (layer.selectedAnnotation && !layer.selectedAnnotation.changed.signalReady) {
      if (props.onAnnotationSelectionChanged) {
        recordRemover(layer.selectedAnnotation.changed.add(() => {
          props.onAnnotationSelectionChanged(layer.selectedAnnotation.value);
        }));
        recordRemover(() => {
          layer.selectedAnnotation.changed.signalReady = false;
        });
        layer.selectedAnnotation.changed.signalReady = true;
      }
    }
    configureAnnotationSourceChange(layer, props, recordRemover);
  }
}

export function configureAnnotationLayerChanged(layer, props, recordRemover) {
  if (!layer.layerChanged.signalReady) {
    const remover = layer.layerChanged.add(() => {
      configureAnnotationLayer(layer.layer, props, recordRemover);
    });
    layer.layerChanged.signalReady = true;
    recordRemover(remover);
    recordRemover(() => {
      layer.layerChanged.signalReady = false;
    });

    configureAnnotationLayer(layer.layer, props, recordRemover);
  }
}

export function getAnnotationSelectionHost(key) {
  const viewer = key ? viewersKeyed[key] : viewerNoKey;
  if (viewer) {
    if (viewer.selectionDetailsState) {
      return 'viewer';
    }
    return 'layer';
  }

  return null;
}

export function getSelectedAnnotationId(key, layerName) {
  const viewer = key ? viewersKeyed[key] : viewerNoKey;
  if (viewer) {
    if (viewer.selectionDetailsState) { // New neurolgancer version
      // v.selectionDetailsState.value.layers[0].layer.managedLayer.name
      if (viewer.selectionDetailsState.value) {
        const { layers } = viewer.selectionDetailsState.value;
        if (layers) {
          const layer = layers.find((_layer) => _layer.layer.managedLayer.name === layerName);
          if (layer && layer.state) {
            return layer.state.annotationId;
          }
        }
      }
    } else {
      const layer = getAnnotationLayer(undefined, layerName);
      if (layer && layer.selectedAnnotation && layer.selectedAnnotation.value) {
        return layer.selectedAnnotation.value.id;
      }
    }
  }

  return null;
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
      onViewerStateChanged,
      callbacks,
      ngServer,
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

    this.viewer.expectingExternalUI = true;
    if (ngServer) {
      this.viewer.makeUrlFromState = (state) => {
        const newState = { ...state };
        if (state.layers) {
          // Do not include clio annotation layers
          newState.layers = state.layers.filter((layer) => {
            if (layer.source) {
              const sourceUrl = layer.source.url || layer.source;
              if (typeof sourceUrl === 'string') {
                return !sourceUrl.startsWith('clio://');
              }
            }
            return true;
          });
        }
        return `${ngServer}/#!${encodeFragment(JSON.stringify(newState))}`;
      };
    }
    if (this.viewer.selectionDetailsState) {
      this.viewer.selectionDetailsState.changed.add(this.selectionDetailsStateChanged);
    }
    this.viewer.layerManager.layersChanged.add(this.layersChanged);

    if (viewerState) {
      const newViewerState = viewerState;
      if (newViewerState.projectionScale === null) {
        delete newViewerState.projectionScale;
      }
      if (newViewerState.crossSectionScale === null) {
        delete newViewerState.crossSectionScale;
      }
      if (newViewerState.projectionOrientation === null) {
        delete newViewerState.projectionOrientation;
      }
      if (newViewerState.crossSectionOrientation === null) {
        delete newViewerState.crossSectionOrientation;
      }
      this.viewer.state.restoreState(newViewerState);
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

    this.viewer.state.changed.add(() => {
      if (onViewerStateChanged) {
        try {
          if (this.viewer.state.viewer.position) {
            onViewerStateChanged(this.viewer.state.toJSON());
          }
        } catch (error) {
          console.debug(error);
        }
      }
    });

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
    const selectedSegments = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const layer of this.viewer.layerManager.managedLayers) {
      if (layer.layer instanceof SegmentationUserLayer) {
        const { segmentSelectionState } = layer.layer.displayState;
        selectedSegments[layer.name] = segmentSelectionState.selectedSegment;
      }
    }

    const { viewerState } = this.props;
    if (viewerState) {
      let newViewerState = { ...viewerState };
      let restoreStates = [() => {
        this.viewer.state.restoreState(newViewerState)
      }];
      if (viewerState.projectionScale === null) {
        delete newViewerState.projectionScale;
        restoreStates.push(() => {
          this.viewer.projectionScale.reset();
        });
      }
      if (viewerState.crossSectionScale === null) {
        delete newViewerState.crossSectionScale;
      }
      restoreStates.forEach(restore => restore());
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const layer of this.viewer.layerManager.managedLayers) {
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

  selectionDetailsStateChanged = () => {
    if (this.viewer) {
      const { onSelectionDetailsStateChanged } = this.props;
      if (onSelectionDetailsStateChanged) {
        onSelectionDetailsStateChanged();
      }
    }
  }

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

        // eslint-disable-next-line no-restricted-syntax
        for (const layer of this.viewer.layerManager.managedLayers) {
          if (layer.layer instanceof SegmentationUserLayer) {
            const { segmentSelectionState } = layer.layer.displayState;
            const { visibleSegments } = layer.layer.displayState.segmentationGroupState.value;
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
        const { visibleSegments } = layer.layer.displayState.segmentationGroupState.value;
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
        <p>
          Neuroglancer here with zoom {perspectiveZoom}
        </p>
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

  /**
   * A function of the form `() => {}` to respond to selection changes in the viewer.
   */
  onSelectionDetailsStateChanged: PropTypes.func,
  onViewerStateChanged: PropTypes.func,

  callbacks: PropTypes.arrayOf(PropTypes.object),
  ngServer: PropTypes.string,
};

Neuroglancer.defaultProps = {
  perspectiveZoom: 20,
  eventBindingsToUpdate: null,
  brainMapsClientId: 'NOT_A_VALID_ID',
  viewerState: null,
  onSelectedChanged: null,
  onVisibleChanged: null,
  onSelectionDetailsStateChanged: null,
  onViewerStateChanged: null,
  key: null,
  callbacks: [],
  ngServer: 'https://neuroglancer-demo.appspot.com/',
};
