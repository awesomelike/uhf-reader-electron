const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const rules = require('./webpack.rules');

const assets = ['fonts', 'images', 'icons'];

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
}, {
  test: /\.(png|jpg|jpeg|gif)$/,
  loader: 'file-loader',
});

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins: assets.map((asset) => new CopyWebpackPlugin({
    patterns: [
      {
        from: path.resolve(__dirname, 'src/assets', asset),
        to: path.resolve(__dirname, '.webpack/renderer', asset),
      },
      {
        from: path.resolve(__dirname, 'src/assets', asset),
        to: path.resolve(__dirname, '.webpack/main', asset),
      },
    ],
  })),
};
