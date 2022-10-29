const CopyPlugin = require("copy-webpack-plugin");
const WebpackBuildNotifierPlugin = require('webpack-build-notifier');
const path = require("path");

module.exports = {
  entry: {
    index: './src/bootstrap.ts',
  },
  mode: "development",
  devtool: 'eval-source-map',
  plugins: [
    new CopyPlugin([
      {
        from: "../assets/img",
        to: "img/",
      },
      {
        from: "../assets/css",
        to: "css/",
      },
      {
        from: "index.html",
        to: "index.html"
      }
    ]),
    new WebpackBuildNotifierPlugin({
      title: "Tylercraft",
    })
  ],
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      "@craft/rust-world": path.resolve(__dirname, "../../world/pkg")
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: {
          configFile: 'tsconfig.json',
          projectReferences: true,
        }
      },
      {
        test: /\.glsl$/,
        type: "asset/source"
      },
      {
        test: /engine+/,
        enforce: "pre",
        use: ["source-map-loader"],
      },
      // {
      //   test: /\.worker\.js$/,
      //   use: { loader: "worker-loader" },
      // },
    ],
  },
  experiments: {
    asyncWebAssembly: true,
  }
};