# react-neuroglancer

## Overview
react-neuroglancer is a react wrapper around an old fork of neuroglancer. It is used to embbed the neuroglancer viewer into a react application and allow the parent application to interact with the contents of the neuroglancer view and vice versa.

## Installation
```bash
npm install @janelia-flyem/react-neuroglancer
# or
yarn add @janelia-flyem/react-neuroglancer
```

## Usage
```jsx
import Neuroglancer from '@janelia-flyem/react-neuroglancer';

const Example = () => {
    return (
      <Neuroglancer
        perspectiveZoom={80}
        viewerState={viewerState}
        brainMapsClientId="NOT_A_VALID_ID"
        ngServer="https://clio-ng.janelia.org"
        onViewerStateChanged={onViewerStateChanged}
      />
    );
};
```

## Components
### Neuroglancer
The main component that will show the neuroglancer viewer.

#### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| perspectiveZoom | number | 20 | The starting zoom level of the viewer |
| viewerState | object | {} | The core object that describes the current state of the neuroglancer viewer. |
| brainMapsClientId| string | NOT_A_VALID_ID | Client ID used to access [Google brainmaps API](https://natverse.org/fafbseg/reference/index.html#brainmaps-api)  |
| eventBindingsToUpdate | object[] | [] |  An array of event bindings to change in Neuroglancer.  The array format is as follows: [[old-event1, new-event1], [old-event2], old-event3] Here, `old-event1`'s will be unbound and its action will be re-bound to `new-event1`. The bindings for `old-event2` and `old-event3` will be removed. Neuroglancer has its own syntax for event descriptors, and here are some examples:'keya', 'shift+keyb' 'control+keyc', 'digit4', 'space', 'arrowleft', 'comma', 'period', 'minus', 'equal', 'bracketleft'.|
| onViewerStateChanged | function | (viewerState) => { return } | A callback function that is called whenever a change is made to the state of the neuroglancer component. This can be used to update values in the containing application. |
| ngServer | url | 'https://neuroglancer-demo.appspot.com/' | Base url for a neuroglancer server that will be used to create external links |

#### Example viewerState

The viewerState should be defined before creating the neuroglancer viewer. Here is a simple example of a state that shows two lawyers in the viewer.

```javascript
{
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
    perspectiveZoom: 20,
    navigation: {
        zoomFactor: 8
    }
}
```
To see more complicated examples, click on the '{}' button located at the top right  in neuroglancer and view the JSON object that is displayed. 

## License
[3-Clause BSD License](LICENSE.md)
