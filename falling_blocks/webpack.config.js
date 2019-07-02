// const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: './public/src/game.ts',
  mode: "development",
  devtool: 'inline-source-map',
  plugins: [
    // new CleanWebpackPlugin(['public/build']),
    new HtmlWebpackPlugin({
      template: 'public/index.html',
      filename: "index.html",
    }),
    new CopyPlugin([{
        from: "public/static/shaders",
        to: "shaders/"
      }, {
        from: "public/static/imgs",
        to: "imgs/"
      },
      {
        from: "public/js",
        to: "js/"
      }
    ])
  ],
  output: {
    path: __dirname + '/static',
    filename: 'main.js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      loader: 'ts-loader'
    }]
  }
}