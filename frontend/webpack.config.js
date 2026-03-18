const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { container } = require('webpack');

// .env 파일 로드
try { require('dotenv').config({ path: path.resolve(__dirname, '.env') }); } catch (e) { /* dotenv optional */ }

module.exports = {
  mode: 'development',
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    publicPath: 'http://localhost:3002/',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src/'),
      '@common': path.resolve(__dirname, '../common/frontend/src/'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
          },
        },
      },
      {
        test: /\.module\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]__[local]--[hash:base64:5]',
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        exclude: /\.module\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new container.ModuleFederationPlugin({
      name: 'ledgerApp',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
        'react-router-dom': { singleton: true, requiredVersion: false },
        axios: { singleton: true, requiredVersion: false },
        'keycloak-js': { singleton: true, requiredVersion: false },
      },
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({
        NODE_ENV: process.env.NODE_ENV || 'development',
        REACT_APP_BASE_API_URL: process.env.REACT_APP_BASE_API_URL || '',
        REACT_APP_KEYCLOAK_URL: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8180',
        REACT_APP_KEYCLOAK_REALM: process.env.REACT_APP_KEYCLOAK_REALM || 'hamkkebu',
        REACT_APP_KEYCLOAK_CLIENT_ID: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'hamkkebu-frontend',
      }),
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      favicon: false,
    }),
  ],
  devServer: {
    port: 3002,
    host: '0.0.0.0',
    historyApiFallback: true,
    hot: true,
    allowedHosts: 'all',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    proxy: {
      '/api': {
        target: process.env.API_GATEWAY_URL || 'http://localhost:9000',
        changeOrigin: true,
      },
    },
  },
};
