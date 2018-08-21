import { setupDefaultViewer } from 'neuroglancer';
import React from 'react';
export default class Neuroglancer extends React.Component {
  constructor(props) {
    super(props);
    this.ngContainer = React.createRef();
  }

  componentDidMount() {
    const viewer = setupDefaultViewer();
    viewer.state.restoreState({
      layers: {
        grayscale: {
          type: 'image',
          source: 'dvid://http://emdata3:8600/a89eb3af216a46cdba81204d8f954786/grayscalejpeg',
        },
      },
      perspectiveZoom: 80,
      navigation: {
        zoomFactor: 8,
      },
    });

    window.viewer = viewer;
  }

  render() {
    return (
      <div id="neuroglancer-container" ref={this.ngContainer}>
        Neuroglancer here.
      </div>
    );
  }
}
