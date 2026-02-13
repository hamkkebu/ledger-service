const { defineConfig } = require('@vue/cli-service')
const { ModuleFederationPlugin } = require('webpack').container
const path = require('path')

module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: 'auto',
  configureWebpack: {
    resolve: {
      alias: {
        '@common': path.resolve(__dirname, 'common/frontend/src')
      }
    },
    plugins: [
      new ModuleFederationPlugin({
        name: 'ledgerApp',
        filename: 'remoteEntry.js',

        // Shell App에 노출할 컴포넌트
        exposes: {
          './App': './src/App.vue',
        },

        // 공유 의존성 (Shell App과 중복 로드 방지)
        shared: {
          vue: {
            singleton: true,
            requiredVersion: '^3.2.13',
          },
          'vue-router': {
            singleton: true,
            requiredVersion: '^4.2.2',
          },
          axios: {
            singleton: true,
            requiredVersion: '^1.4.0',
          },
          'keycloak-js': {
            singleton: true,
            requiredVersion: '^26.2.1',
          },
        },
      }),
    ],
  },
  devServer: {
    port: 3002,
    historyApiFallback: true,

    // CORS 허용 (Shell App에서 remoteEntry.js 로드)
    headers: {
      'Access-Control-Allow-Origin': '*',
    },

    // API 요청은 API Gateway로 프록시
    proxy: {
      '/api': {
        target: process.env.VUE_APP_API_URL || 'http://localhost:9000',
        changeOrigin: true,
        ws: false,
      }
    }
  }
})
