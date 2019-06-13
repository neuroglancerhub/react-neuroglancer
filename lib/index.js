"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _neuroglancer = require("@janelia-flyem/neuroglancer");

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _segmentation_user_layer = require("@janelia-flyem/neuroglancer/dist/module/neuroglancer/segmentation_user_layer");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Neuroglancer =
/*#__PURE__*/
function (_React$Component) {
  _inherits(Neuroglancer, _React$Component);

  function Neuroglancer(props) {
    var _this;

    _classCallCheck(this, Neuroglancer);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Neuroglancer).call(this, props));

    _defineProperty(_assertThisInitialized(_this), "layersChanged", function () {
      if (_this.handlerRemovers) {
        // If change handlers have been added already, call the function to remove each one,
        // so there won't be duplicates when new handlers are added below.
        _this.handlerRemovers.forEach(function (remover) {
          return remover();
        });
      }

      if (_this.viewer) {
        var _this$props = _this.props,
            onSelectedChanged = _this$props.onSelectedChanged,
            onVisibleChanged = _this$props.onVisibleChanged;

        if (onSelectedChanged || onVisibleChanged) {
          _this.handlerRemovers = [];
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = _this.viewer.layerManager.managedLayers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var layer = _step.value;

              if (layer.layer instanceof _segmentation_user_layer.SegmentationUserLayer) {
                var _layer$layer$displayS = layer.layer.displayState,
                    segmentSelectionState = _layer$layer$displayS.segmentSelectionState,
                    visibleSegments = _layer$layer$displayS.visibleSegments;

                if (segmentSelectionState && onSelectedChanged) {
                  // Bind the layer so it will be an argument to the handler when called.
                  var selectedChanged = _this.selectedChanged.bind(undefined, layer);

                  var remover = segmentSelectionState.changed.add(selectedChanged);

                  _this.handlerRemovers.push(remover);

                  layer.registerDisposer(remover);
                }

                if (visibleSegments && onVisibleChanged) {
                  var visibleChanged = _this.visibleChanged.bind(undefined, layer);

                  var _remover = visibleSegments.changed.add(visibleChanged);

                  _this.handlerRemovers.push(_remover);

                  layer.registerDisposer(_remover);
                }
              }
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator["return"] != null) {
                _iterator["return"]();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        }
      }
    });

    _defineProperty(_assertThisInitialized(_this), "selectedChanged", function (layer) {
      if (_this.viewer) {
        var onSelectedChanged = _this.props.onSelectedChanged;

        if (onSelectedChanged) {
          var segmentSelectionState = layer.layer.displayState.segmentSelectionState;

          if (segmentSelectionState) {
            var segment = segmentSelectionState.hasSelectedSegment ? segmentSelectionState.selectedSegment : null;
            onSelectedChanged(segment, layer);
          }
        }
      }
    });

    _defineProperty(_assertThisInitialized(_this), "visibleChanged", function (layer) {
      if (_this.viewer) {
        var onVisibleChanged = _this.props.onVisibleChanged;

        if (onVisibleChanged) {
          var visibleSegments = layer.layer.displayState.visibleSegments;

          if (visibleSegments) {
            onVisibleChanged(visibleSegments, layer);
          }
        }
      }
    });

    _this.ngContainer = _react["default"].createRef();
    _this.viewer = null;
    return _this;
  }

  _createClass(Neuroglancer, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      var _this$props2 = this.props,
          perspectiveZoom = _this$props2.perspectiveZoom,
          viewerState = _this$props2.viewerState,
          brainMapsClientId = _this$props2.brainMapsClientId;
      this.viewer = (0, _neuroglancer.setupDefaultViewer)({
        BrainMapsClientId: brainMapsClientId
      });
      this.viewer.layerManager.layersChanged.add(this.layersChanged);

      if (viewerState) {
        this.viewer.state.restoreState(viewerState);
      } else {
        this.viewer.state.restoreState({
          layers: {
            grayscale: {
              type: 'image',
              source: 'dvid://https://flyem.dvid.io/ab6e610d4fe140aba0e030645a1d7229/grayscalejpeg'
            },
            segmentation: {
              type: 'segmentation',
              source: 'dvid://https://flyem.dvid.io/d925633ed0974da78e2bb5cf38d01f4d/segmentation'
            }
          },
          perspectiveZoom: perspectiveZoom,
          navigation: {
            zoomFactor: 8
          }
        });
      } // TODO: This is purely for debugging and we need to remove it.


      window.viewer = this.viewer;
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      var viewerState = this.props.viewerState;

      if (viewerState) {
        this.viewer.state.restoreState(viewerState);
      }
    }
  }, {
    key: "render",
    value: function render() {
      var perspectiveZoom = this.props.perspectiveZoom;
      return _react["default"].createElement("div", {
        id: "neuroglancer-container",
        ref: this.ngContainer
      }, _react["default"].createElement("p", null, "Neuroglancer here with zoom ", perspectiveZoom));
    }
  }]);

  return Neuroglancer;
}(_react["default"].Component);

exports["default"] = Neuroglancer;
Neuroglancer.propTypes = {
  perspectiveZoom: _propTypes["default"].number,
  viewerState: _propTypes["default"].object,

  /**
   * A function of the form `(segment, layer) => {}`, called each time there is a change to 
   * the segment the user has "selected" (i.e., hovered over) in Neuroglancer.
   * The `segment` argument will be a Neuroglancer `Uint64` with the ID of the now-selected
   * segment, or `null` if no segment is now selected.
   * The `layer` argument will be a Neuroglaner `ManagedUserLayer`, whose `layer` property 
   * will be a Neuroglancer `SegmentationUserLayer`.
   */
  onSelectedChanged: _propTypes["default"].func,

  /**
   * A function of the form `(segments, layer) => {}`, called each time there is a change to 
   * the segments the user has designated as "visible" (i.e., double-clicked on) in Neuroglancer.
   * The `segments` argument will be a Neuroglancer `Uint64Set` whose elements are `Uint64`
   * instances for the IDs of the now-visible segments.
   * The `layer` argument will be a Neuroglaner `ManagedUserLayer`, whose `layer` property 
   * will be a Neuroglancer `SegmentationUserLayer`.
   */
  onVisibleChanged: _propTypes["default"].func
};
Neuroglancer.defaultProps = {
  perspectiveZoom: 20,
  viewerState: null,
  onSelectedChanged: null,
  onVisibleChanged: null
};