// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false';

console.log(`using sourcemap: ${shouldUseSourceMap}`);

module.exports = {
  mode: 'development',
  devtool: shouldUseSourceMap ? 'inline-source-map' : false,
  devServer: {
    contentBase: './lib'
  },
  resolve: {
    extensions: ['*', '.js', '.jsx']
  },
  plugins: [
    // new BundleAnalyzerPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: ["babel-loader"]
      }
    ]
  }
}
