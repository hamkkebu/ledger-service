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
 * 라우터 가드: Keycloak SSO 기반 인증 확인
 */
router.beforeEach(async (to, from, next) => {
  const { isAuthenticated, login, initAuth, isInitialized } = useAuth();

  // 초기화가 안 되어 있으면 초기화
  if (!isInitialized.value) {
    await initAuth();
  }

  const requiresAuth = to.meta.requiresAuth;

  // 인증이 필요한 페이지인 경우
  if (requiresAuth) {
    if (!isAuthenticated.value) {
      // Keycloak 로그인 페이지로 리다이렉트
      login(window.location.origin + to.fullPath);
      return;
    }
  }

  next();
});

export default router;
