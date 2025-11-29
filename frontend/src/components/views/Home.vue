<template>
  <div class="home">
    <div class="hero glass">
      <h1 class="gradient-text">함께부</h1>
      <p class="subtitle">여럿이서 함께 관리하는 똑똑한 가계부</p>

      <div class="features">
        <div class="feature">
          <span class="feature-icon">👨‍👩‍👧‍👦</span>
          <h3>함께 기록</h3>
          <p>가족, 친구, 동료와 함께 수입/지출 기록</p>
        </div>
        <div class="feature">
          <span class="feature-icon">🔗</span>
          <h3>공유 가계부</h3>
          <p>하나의 가계부를 여러 명이 함께 관리</p>
        </div>
        <div class="feature">
          <span class="feature-icon">📊</span>
          <h3>실시간 현황</h3>
          <p>모두가 함께 보는 재정 상태</p>
        </div>
      </div>

      <div class="cta">
        <router-link v-if="isAuthenticated" to="/dashboard" class="btn-primary">
          대시보드로 이동
        </router-link>
        <router-link v-else to="/create" class="btn-primary">
          시작하기
        </router-link>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue';
import { useAuth } from '@/composables/useAuth';

export default defineComponent({
  name: 'HomePage',
  setup() {
    const { isAuthenticated, restoreAuth } = useAuth();

    onMounted(() => {
      restoreAuth();
    });

    return {
      isAuthenticated,
    };
  },
});
</script>

<style scoped>
.home {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.hero {
  text-align: center;
  padding: 4rem;
  border-radius: var(--radius-xl);
  animation: slideUp 0.6s ease-out;
  max-width: 900px;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.25rem;
  margin-bottom: 3rem;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.feature {
  padding: 1.5rem;
  background: var(--hover-bg);
  border-radius: var(--radius-lg);
  transition: transform 0.2s ease;
}

.feature:hover {
  transform: translateY(-4px);
}

.feature-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 1rem;
}

.feature h3 {
  margin-bottom: 0.5rem;
  font-size: 1.125rem;
}

.feature p {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.cta {
  margin-top: 2rem;
}

.btn-primary {
  background: var(--gradient-primary);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
  text-decoration: none;
  display: inline-block;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}
</style>
