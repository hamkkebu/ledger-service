import { createApp } from 'vue';
import App from './App.vue';
import router from '@/components/router';
import apiClient from '@/api/client';
import { useAuth } from '@/composables/useAuth';

const app = createApp(App);

// Vue Router 사용
app.use(router);

// Axios 인스턴스를 전역 속성으로 등록
app.config.globalProperties.axios = apiClient;

// 앱 마운트 전에 Keycloak 인증 초기화 수행
// 라우터 가드가 실행되기 전에 인증 상태가 복원되어야 함
const { initAuth } = useAuth();

initAuth()
  .catch((error) => {
    console.error('Auth initialization failed:', error);
  })
  .finally(() => {
    app.mount('#app');
  });
