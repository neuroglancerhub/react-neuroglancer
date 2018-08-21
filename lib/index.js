'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _neuroglancer = require('neuroglancer');

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Neuroglancer = function (_React$Component) {
  _inherits(Neuroglancer, _React$Component);

  function Neuroglancer(props) {
    _classCallCheck(this, Neuroglancer);

    var _this = _possibleConstructorReturn(this, (Neuroglancer.__proto__ || Object.getPrototypeOf(Neuroglancer)).call(this, props));

    _this.ngContainer = _react2.default.createRef();
    return _this;
  }

  _createClass(Neuroglancer, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var viewer = (0, _neuroglancer.setupDefaultViewer)();
      viewer.state.restoreState({
        layers: {
          grayscale: {
            type: 'image',
            source: 'dvid://http://emdata3:8600/a89eb3af216a46cdba81204d8f954786/grayscalejpeg'
          }
        },
        perspectiveZoom: 80,
        navigation: {
          zoomFactor: 8
        }
      });

      window.viewer = viewer;
    }
  }, {
    key: 'render',
    value: function render() {
      return _react2.default.createElement(
        'div',
        { id: 'neuroglancer-container', ref: this.ngContainer },
        'Neuroglancer here.'
      );
    }
  }]);

  return Neuroglancer;
}(_react2.default.Component);

exports.default = Neuroglancer;