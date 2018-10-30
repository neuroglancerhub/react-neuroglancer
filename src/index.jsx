import { setupDefaultViewer } from '@janelia-flyem/neuroglancer';
import React from 'react';
import PropTypes from 'prop-types';

export default class Neuroglancer extends React.Component {
  constructor(props) {
    super(props);
    this.ngContainer = React.createRef();
  }

  componentDidMount() {
    const { perspectiveZoom, viewerState } = this.props;
    const viewer = setupDefaultViewer();

    if (viewerState) {
      viewer.state.restoreState(viewerState);
    } else {
      viewer.state.restoreState({
        layers: {
          grayscale: {
            type: 'image',
            source: 'dvid://http://emdata3:8600/a89eb3af216a46cdba81204d8f954786/grayscalejpeg',
          },
          segmentation: {
            type: 'segmentation',
            source: 'dvid://http://emdata3:8900/a776af0b132f44c3a428fe7607ba0da0/segmentation',
          },
        },
        perspectiveZoom,
        navigation: {
          zoomFactor: 8,
        },
      });
    }

    // TODO: This is purely for debugging and we need to remove it.
    window.viewer = viewer;
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
