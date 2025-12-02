<template>
  <nav class="navbar glass">
    <div class="navbar-brand">
      <span class="gradient-text">함께부</span>
    </div>
    <div v-if="isAuthenticated" class="navbar-menu">
      <router-link to="/dashboard" class="nav-link">대시보드</router-link>
      <a href="http://localhost:3001/userinfo" class="nav-link">내 정보</a>
      <span class="user-info">{{ username }}</span>
      <button @click="logout" class="nav-link logout-btn">로그아웃</button>
    </div>
  </nav>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useAuth } from '@/composables/useAuth';

export default defineComponent({
  name: 'NavBar',
  setup() {
    const { currentUser, isAuthenticated, logout: authLogout } = useAuth();

    const username = computed(() => currentUser.value?.username || '');

    const handleLogout = async () => {
      if (confirm('로그아웃 하시겠습니까?')) {
        // Keycloak SSO 로그아웃 - 자동으로 리다이렉트됨
        await authLogout();
      }
    };

    return {
      isAuthenticated,
      username,
      logout: handleLogout,
    };
  },
});
</script>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-brand {
  font-size: 1.5rem;
  font-weight: 700;
}

.navbar-menu {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-link {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: var(--text-primary);
}

.nav-link.router-link-active {
  color: var(--accent-purple);
}

.user-info {
  color: var(--accent-cyan);
  font-weight: 500;
}

.logout-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: inherit;
  font-family: inherit;
}
</style>
