const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const WebpackBuildNotifierPlugin = require('webpack-build-notifier');
const path = require("path");


module.exports = {
  entry: {
    index: './app.ts',
    // terrain: './app/terrainClient/terrainApp.ts'
  },
  mode: "development",
  devtool: 'inline-source-map',
  plugins: [
    new HtmlWebpackPlugin({
      template: '../assets/index.html',
      chunks: ["index"],
      filename: "index.html",
    }),
    // new HtmlWebpackPlugin({
    //   template: 'app/assets/terrain.html',
    //   chunks: ["terrain"],
    //   filename: "terrain.html",
    // }),
    new CopyPlugin([
      {
        from: "../assets/img",
        to: "img/",
      },
      {
        from: "../assets/css",
        to: "css/",
      },
    ]),
    new WebpackBuildNotifierPlugin({
      title: "Tylercraft",
    })
  ],
  output: {
    path: path.resolve(__dirname, '../../../dist/public'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: require.resolve('ts-loader'),
        options: {
          configFile: './tsconfig.json',
          projectReferences: true,
        }
      },
      {
        test: /\.worker\.js$/,
        use: { loader: "worker-loader" },
      },
      {
        test: /\.glsl$/,
        use: 'raw-loader'
      }
    ],
  },
};
