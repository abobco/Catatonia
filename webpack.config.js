const path = require('path');

// webpack.config.js
//const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  // mode: 'development',
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
    host: '10.0.0.43',
  },
  devtool: 'inline-source-map',
  module: {
    rules:[
      {
        test: /\.(vert|frag)$/i,
        use: 'raw-loader'
      }
    ],
  },
  // plugins: [
  //   new BundleAnalyzerPlugin(),
  // ]
};