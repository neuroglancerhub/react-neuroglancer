import { setupDefaultViewer } from 'neuroglancer';
import React from 'react';
import PropTypes from 'prop-types';

export default class Neuroglancer extends React.Component {
  constructor(props) {
    super(props);
    this.ngContainer = React.createRef();
  }

  componentDidMount() {
    const { perspectiveZoom } = this.props;
    const viewer = setupDefaultViewer();
    viewer.state.restoreState({
      layers: {
        grayscale: {
          type: 'image',
          source: 'dvid://http://emdata3:8600/a89eb3af216a46cdba81204d8f954786/grayscalejpeg',
        },
      },
      perspectiveZoom,
      navigation: {
        zoomFactor: 8,
      },
    });

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
};

Neuroglancer.defaultProps = {
  perspectiveZoom: 20,
};
