"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _neuroglancer = require("@janelia-flyem/neuroglancer");

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Neuroglancer =
/*#__PURE__*/
function (_React$Component) {
  _inherits(Neuroglancer, _React$Component);

  function Neuroglancer(props) {
    var _this;

    _classCallCheck(this, Neuroglancer);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Neuroglancer).call(this, props));
    _this.ngContainer = _react["default"].createRef();
    _this.viewer = null;
    return _this;
  }

  _createClass(Neuroglancer, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      var _this$props = this.props,
          perspectiveZoom = _this$props.perspectiveZoom,
          viewerState = _this$props.viewerState,
          brainMapsClientId = _this$props.brainMapsClientId;
      this.viewer = (0, _neuroglancer.setupDefaultViewer)({
        BrainMapsClientId: brainMapsClientId
      });

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
      this.viewer.state.restoreState(viewerState);
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
  viewerState: _propTypes["default"].object
};
Neuroglancer.defaultProps = {
  perspectiveZoom: 20,
  viewerState: null
};