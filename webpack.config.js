const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const WebpackBuildNotifierPlugin = require('webpack-build-notifier');

module.exports = {
  entry: {
    index: './app/client/app.ts',
    terrain: './app/terrainClient/terrainApp.ts'
  },
  mode: "development",
  devtool: 'inline-source-map',
  plugins: [
    new HtmlWebpackPlugin({
      template: 'app/assets/index.html',
      chunks: ["index"],
      filename: "index.html",
    }),
    new HtmlWebpackPlugin({
      template: 'app/assets/terrain.html',
      chunks: ["terrain"],
      filename: "terrain.html",
    }),
    new CopyPlugin([{
      from: "app/assets/shaders",
      to: "shaders/",
    }, {
      from: "app/assets/img",
      to: "img/",
    },
    {
      from: "app/assets/js",
      to: "js/",
    },
    {
      from: "app/assets/css",
      to: "css/",
    },
    ]),
    new WebpackBuildNotifierPlugin({
      title: "Tylercraft",
    })
  ],
  output: {
    path: __dirname + '/dist/public',
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      // Handle Typescript
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          configFile: 'app/client/tsconfig.json'
        }
      },
      {
        test: /\.worker\.js$/,
        use: { loader: "worker-loader" },
      },
    ],
  },
};
