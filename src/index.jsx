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

    // TODO: This is purely for debugging and we need to remove it.
    window.viewer = this.viewer;
  }

  componentDidUpdate() {
    const { viewerState } = this.props;
    this.viewer.state.restoreState(viewerState);
  }

  render() {
    const { perspectiveZoom } = this.props;
    return (
      <div id="neuroglancer-container" ref={this.ngContainer}>
        <p>Neuroglancer here with zoom { perspectiveZoom }</p>
      </div>
    );
  }
}

Neuroglancer.propTypes = {
  perspectiveZoom: PropTypes.number,
  viewerState: PropTypes.object,
};

Neuroglancer.defaultProps = {
  perspectiveZoom: 20,
  viewerState: null,
};
