const path = require('path');

// webpack.config.js
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;




module.exports = {
  context: path.resolve(__dirname, 'src'),
  entry: './main.js',
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'dist')
  },
  node: {
    fs: "empty"
  },
  devServer: {
    contentBase: './dist',
  },
  devtool: 'inline-source-map',
  // plugins: [
  //   new BundleAnalyzerPlugin(),
  // ],
};