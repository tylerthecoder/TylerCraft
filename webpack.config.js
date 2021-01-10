// const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const DotenvPlugin = require('dotenv-webpack');


module.exports = {
  entry: './app/client/app.ts',
  mode: "development",
  devtool: 'inline-source-map',
  plugins: [
    // new CleanWebpackPlugin(['public/build']),
    new HtmlWebpackPlugin({
      template: 'app/assets/index.html',
      filename: "index.html",
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
    new DotenvPlugin({
      path: process.env.DOTENV_CONFIG_PATH,
    }),
  ],
  output: {
    path: __dirname + '/dist/public',
    filename: 'main.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      loader: 'ts-loader',
      options: {
        configFile: 'app/client/tsconfig.json'
      }
    }],
  },
};