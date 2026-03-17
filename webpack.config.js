const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: path.resolve(__dirname, "src/app.ts"),
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
    publicPath: '', // Пустой publicPath для относительных путей
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  devServer: {
    static: path.resolve(__dirname, "public"),
    port: 8080,
    hot: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.md$/,
        type: 'asset/source',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "public/index.html"),
    }),
    new CopyPlugin({
      patterns: [
        { 
          from: "public/models", 
          to: "models", // Скопирует в dist/models/
          noErrorOnMissing: false, // Меняем на false, чтобы видеть ошибки
        },
        // Добавляем копирование самой модели, если она в корне public
        {
          from: "public/*.glb",
          to: "[name][ext]",
          noErrorOnMissing: true,
        },
        // Копируем все ресурсы, которые могут понадобиться
        {
          from: "public/**/*",
          to: "[path][name][ext]",
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
  devtool: "source-map",
  mode: "development",
};