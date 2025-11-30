import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuth } from '@/composables/useAuth';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/home',
    name: 'Home',
    redirect: '/dashboard',
  },
  {
    path: '/create',
    name: 'LedgerCreate',
    component: () => import('@/components/views/LedgerCreate.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/components/views/Dashboard.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/ledger/:id',
    name: 'LedgerDetail',
    component: () => import('@/components/views/LedgerDetail.vue'),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

/**
 * Keycloak 콜백 URL인지 확인
 * (authorization code flow 완료 후 리다이렉트된 경우)
 */
const isKeycloakCallback = (): boolean => {
  const hash = window.location.hash;
  const search = window.location.search;
  return hash.includes('code=') || hash.includes('state=') ||
         search.includes('code=') || search.includes('state=');
};

/**
 * 라우터 가드: Keycloak SSO 기반 인증 확인
 */
router.beforeEach(async (to, from, next) => {
  const { isAuthenticated, login, initAuth, isInitialized } = useAuth();

  // Keycloak 콜백인 경우 처리 대기
  const isCallback = isKeycloakCallback();

  // 초기화가 안 되어 있으면 초기화
  if (!isInitialized.value) {
    await initAuth();
  }

  const requiresAuth = to.meta.requiresAuth;

  // 인증이 필요한 페이지인 경우
  if (requiresAuth) {
    if (!isAuthenticated.value) {
      // 콜백 처리 중인데 인증 실패한 경우 무한 루프 방지
      if (isCallback) {
        console.error('Keycloak callback authentication failed');
        // URL에서 콜백 파라미터 제거
        window.history.replaceState({}, document.title, to.path);
        // 재시도를 위해 홈으로 리다이렉트
        next('/');
        return;
      }
      // Keycloak 로그인 페이지로 리다이렉트
      login(window.location.origin + to.fullPath);
      return;
    }
  }

  next();
});

export default router;
