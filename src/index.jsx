import { setupDefaultViewer } from '@janelia-flyem/neuroglancer';
import React from 'react';
import PropTypes from 'prop-types';

export default class Neuroglancer extends React.Component {
  constructor(props) {
    super(props);
    this.ngContainer = React.createRef();
    this.viewer = null;
  }

  componentDidMount() {
    const { perspectiveZoom, viewerState, brainMapsClientId } = this.props;
    this.viewer = setupDefaultViewer({
      BrainMapsClientId: brainMapsClientId,
    });

    if (viewerState) {
      this.viewer.state.restoreState(viewerState);
    } else {
      this.viewer.state.restoreState({
        layers: {
          grayscale: {
            type: 'image',
            source: 'dvid://https://flyem.dvid.io/ab6e610d4fe140aba0e030645a1d7229/grayscalejpeg',
          },
          segmentation: {
            type: 'segmentation',
            source: 'dvid://https://flyem.dvid.io/d925633ed0974da78e2bb5cf38d01f4d/segmentation',
          },
        },
        perspectiveZoom,
        navigation: {
          zoomFactor: 8,
        },
      });
    }

    this.setupChangedDispatch();

    // TODO: This is purely for debugging and we need to remove it.
    window.viewer = this.viewer;
  }

  componentDidUpdate() {
    const { viewerState } = this.props;
    if (viewerState) {
      this.viewer.state.restoreState(viewerState);
    }
  }

  render() {
    const { perspectiveZoom } = this.props;
    return (
      <div id="neuroglancer-container" ref={this.ngContainer}>
        <p>Neuroglancer here with zoom { perspectiveZoom }</p>
      </div>
    );
  }

  setupChangedDispatch = () => {
    if (this.viewer) {
      const { onSelectedChanged, onVisibleChanged } = this.props;
      if (onSelectedChanged || onVisibleChanged) {
        const segmentationLayer = this.viewer.layerManager.getLayerByName('segmentation');
        if (segmentationLayer) {
          const { segmentSelectionState, visibleSegments } = segmentationLayer.layer.displayState;
          if (segmentSelectionState && onSelectedChanged) {
            segmentationLayer.registerDisposer(segmentSelectionState.changed.add(this.selectedChanged));
          }
          if (visibleSegments && onVisibleChanged) {
            segmentationLayer.registerDisposer(visibleSegments.changed.add(this.visibleChanged));
          }
        }  
      }  
    }
  }

  selectedChanged = () => {
    if (this.viewer) {
      const { onSelectedChanged } = this.props;
      if (onSelectedChanged) {
        const segmentationLayer = this.viewer.layerManager.getLayerByName('segmentation');
        if (segmentationLayer) {
          const { segmentSelectionState } = segmentationLayer.layer.displayState;
          if (segmentSelectionState) {
            const segment = segmentSelectionState.hasSelectedSegment ? segmentSelectionState.selectedSegment : null;
            onSelectedChanged(segment);
          }
        }  
      }  
    }
  }

  visibleChanged = () => {
    if (this.viewer) {
      const { onVisibleChanged } = this.props;
      if (onVisibleChanged) {
        const segmentationLayer = this.viewer.layerManager.getLayerByName('segmentation');
        if (segmentationLayer) {
          const { visibleSegments } = segmentationLayer.layer.displayState;
          if (visibleSegments) {
            onVisibleChanged(visibleSegments);
          }
        }  
      }  
    }
  }
}

Neuroglancer.propTypes = {
  perspectiveZoom: PropTypes.number,
  viewerState: PropTypes.object,

  /**
   * A function of the form `(segment) => {}`, called each time there is a change to 
   * the segment the user has "selected" (i.e., hovered over) in Neuroglancer.
   * The `segment` argument will be a Neuroglancer `Uint64` with the ID of the now-selected
   * segment, or `null` if no segment is now selected.
   */
  onSelectedChanged: PropTypes.func,

  /**
   * A function of the form `(segments) => {}`, called each time there is a change to 
   * the segments the user has designated as "visible" (i.e., double-clicked on) in Neuroglancer.
   * The `segments` argument will be a Neuroglancer `Uint64Set` whose elements are `Uint64`
   * instances for the IDs of the now-visible segments.
   */
  onVisibleChanged: PropTypes.func,
};

Neuroglancer.defaultProps = {
  perspectiveZoom: 20,
  viewerState: null,
  onSelectedChanged: null,
  onVisibleChanged: null,
};
