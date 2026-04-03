const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './src/app.ts',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: './'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      
      '@shared/types': path.resolve(__dirname, 'src/shared/types'),
      '@shared/constants': path.resolve(__dirname, 'src/shared/constants'),
      '@shared/interfaces': path.resolve(__dirname, 'src/shared/interfaces'),
      '@shared/helpers': path.resolve(__dirname, 'src/shared/helpers'),
      '@shared/utils': path.resolve(__dirname, 'src/shared/utils'),
      '@shared/errors': path.resolve(__dirname, 'src/shared/errors'),
      
      '@core/di': path.resolve(__dirname, 'src/core/di'),
      '@core/engine': path.resolve(__dirname, 'src/core/engine'),
      '@core/logger': path.resolve(__dirname, 'src/core/logger'),
      '@core/events': path.resolve(__dirname, 'src/core/events'),
      '@core/config': path.resolve(__dirname, 'src/core/config'),
      '@core/assets': path.resolve(__dirname, 'src/core/assets'),
      '@core/scene': path.resolve(__dirname, 'src/core/scene'),
      '@core/ui': path.resolve(__dirname, 'src/core/ui'),
      
      '@features/camera': path.resolve(__dirname, 'src/features/camera'),
      '@features/building': path.resolve(__dirname, 'src/features/building'),
      '@features/markers': path.resolve(__dirname, 'src/features/markers'),
      '@features/ui': path.resolve(__dirname, 'src/features/ui'),
      '@features/background': path.resolve(__dirname, 'src/features/background'),
      '@features/grid': path.resolve(__dirname, 'src/features/grid'),
      '@features/lighting': path.resolve(__dirname, 'src/features/lighting'),
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.md$/,
        type: 'asset/source'
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      'process.env.VERSION': JSON.stringify(require('./package.json').version),
      'process.env.API_URL': JSON.stringify(process.env.API_URL || ''),
      'process.env.LOG_SERVER_URL': JSON.stringify(process.env.LOG_SERVER_URL || '')
    }),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: path.resolve(__dirname, 'public/index.html'),
          to: path.resolve(__dirname, 'dist/index.html'),
          noErrorOnMissing: false
        },
        { 
          from: path.resolve(__dirname, 'public/models'),
          to: path.resolve(__dirname, 'dist/models'),
          noErrorOnMissing: true
        },
        { 
          from: path.resolve(__dirname, 'public/icons'),
          to: path.resolve(__dirname, 'dist/icons'),
          noErrorOnMissing: true
        }
      ]
    })
  ],
  devtool: 'source-map',
  ignoreWarnings: [
    {
      module: /node_modules\/@inversifyjs/,
      message: /Failed to parse source map/
    },
    {
      module: /node_modules\/inversify/,
      message: /Failed to parse source map/
    }
  ]
};