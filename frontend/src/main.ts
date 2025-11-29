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

// 저장된 인증 정보 복원
const { restoreAuth } = useAuth();
restoreAuth();

// 앱 마운트
app.mount('#app');
