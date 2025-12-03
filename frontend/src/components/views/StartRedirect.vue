<template>
  <div class="loading-container">
    <div class="loading-spinner"></div>
    <p>가계부를 확인하는 중...</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ledgerApi } from '@/api/ledgerApi';

export default defineComponent({
  name: 'StartRedirect',
  setup() {
    const router = useRouter();

    onMounted(async () => {
      try {
        // 사용자의 가계부 목록 조회
        const ledgers = await ledgerApi.getLedgers();

        if (ledgers && ledgers.length > 0) {
          // 가계부가 있으면 대시보드로 이동
          router.replace('/dashboard');
        } else {
          // 가계부가 없으면 생성 페이지로 이동
          router.replace('/create');
        }
      } catch (error) {
        console.error('Failed to check ledgers:', error);
        // 에러 시 생성 페이지로 이동
        router.replace('/create');
      }
    });

    return {};
  },
});
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  gap: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

p {
  color: var(--text-secondary);
}
</style>
