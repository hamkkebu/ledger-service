import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuth } from '@/composables/useAuth';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/components/views/Home.vue'),
  },
  {
    path: '/create',
    name: 'LedgerCreate',
    component: () => import('@/components/views/LedgerCreate.vue'),
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

// 인증 가드 - Keycloak 기반
router.beforeEach((to, from, next) => {
  const { isAuthenticated } = useAuth();

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    // 인증이 필요한 페이지 접근 시 Home으로 리다이렉트
    next({ name: 'Home' });
    return;
  }

  next();
});

export default router;
