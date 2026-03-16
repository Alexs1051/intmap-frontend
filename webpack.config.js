const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: path.resolve(__dirname, "src/app.ts"),
  output: {
    filename: "js/bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  devServer: {
    static: path.resolve(__dirname, "public"),
    port: 8080,
    hot: true,
    devMiddleware: {
      publicPath: "/",
    },
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
      logging: 'error',
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
            {
        test: /\.js$/,
        use: ["source-map-loader"],
        enforce: "pre",
        exclude: /node_modules\/@babylonjs/,
      },
    ],
  },
  ignoreWarnings: [
    {
      module: /@babylonjs/,
      message: /sourcemap/,
    },
  ],
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      template: path.resolve(__dirname, "public/index.html"),
    }),
    new CopyPlugin({
      patterns: [
        { from: "public/models", to: "models" },
      ],
    }),
  ],
  mode: "development",
};