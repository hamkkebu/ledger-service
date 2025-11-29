const { defineConfig } = require('@vue/cli-service')
const path = require('path')

module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    resolve: {
      alias: {
        '@common': path.resolve(__dirname, 'common/frontend/src')
      }
    }
  },
  devServer: {
    // History API fallback for SPA routing
    historyApiFallback: true,

    // Proxy only API requests to backend
    proxy: {
      '/api': {
        // ledger-service backend은 개발 환경에서 8082 포트 사용
        target: process.env.VUE_APP_API_URL || 'http://localhost:8082',
        changeOrigin: true,
        ws: false,
      }
    }
  }
})
