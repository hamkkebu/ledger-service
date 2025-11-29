<template>
  <div class="ledger-create">
    <div class="create-container">
      <!-- 헤더 -->
      <div class="create-header">
        <router-link to="/" class="back-link">
          <span class="back-icon">&larr;</span>
          홈으로
        </router-link>
        <h1>새 가계부 만들기</h1>
        <p class="subtitle">나만의 가계부를 만들어 수입과 지출을 체계적으로 관리하세요</p>
      </div>

      <!-- 인증 필요 안내 -->
      <div v-if="!isAuthenticated" class="auth-required glass">
        <div class="auth-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2>로그인이 필요합니다</h2>
        <p>가계부를 만들려면 먼저 Auth Service에서 로그인해주세요.</p>
        <a href="http://localhost:3001" class="btn-primary">
          로그인하러 가기
        </a>
      </div>

      <!-- 생성 폼 -->
      <div v-else class="create-form glass">
        <form @submit.prevent="createLedger">
          <!-- 가계부 이름 -->
          <div class="form-group">
            <label for="name">
              <span class="label-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </span>
              가계부 이름 <span class="required">*</span>
            </label>
            <input
              id="name"
              v-model="formData.name"
              type="text"
              placeholder="예: 생활비, 여행 경비, 프로젝트 예산"
              required
              maxlength="100"
            />
            <span class="char-count">{{ formData.name.length }}/100</span>
          </div>

          <!-- 설명 -->
          <div class="form-group">
            <label for="description">
              <span class="label-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="17" y1="10" x2="3" y2="10"></line>
                  <line x1="21" y1="6" x2="3" y2="6"></line>
                  <line x1="21" y1="14" x2="3" y2="14"></line>
                  <line x1="17" y1="18" x2="3" y2="18"></line>
                </svg>
              </span>
              설명
            </label>
            <textarea
              id="description"
              v-model="formData.description"
              placeholder="이 가계부에 대한 설명을 입력하세요 (선택사항)"
              rows="3"
              maxlength="500"
            ></textarea>
            <span class="char-count">{{ formData.description.length }}/500</span>
          </div>

          <!-- 통화 선택 -->
          <div class="form-group">
            <label for="currency">
              <span class="label-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
              </span>
              통화
            </label>
            <div class="currency-options">
              <label
                v-for="currency in currencies"
                :key="currency.code"
                class="currency-option"
                :class="{ selected: formData.currency === currency.code }"
              >
                <input
                  type="radio"
                  :value="currency.code"
                  v-model="formData.currency"
                />
                <span class="currency-symbol">{{ currency.symbol }}</span>
                <span class="currency-name">{{ currency.name }}</span>
              </label>
            </div>
          </div>

          <!-- 기본 가계부 설정 -->
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="formData.isDefault"
              />
              <span class="checkbox-custom"></span>
              <span class="checkbox-text">
                <strong>기본 가계부로 설정</strong>
                <small>앱 실행 시 이 가계부가 먼저 표시됩니다</small>
              </span>
            </label>
          </div>

          <!-- 에러 메시지 -->
          <div v-if="error" class="error-message">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {{ error }}
          </div>

          <!-- 버튼들 -->
          <div class="form-actions">
            <router-link to="/" class="btn-secondary">취소</router-link>
            <button type="submit" class="btn-primary" :disabled="submitting || !formData.name">
              <span v-if="submitting" class="spinner"></span>
              {{ submitting ? '생성 중...' : '가계부 만들기' }}
            </button>
          </div>
        </form>
      </div>

      <!-- 안내 정보 -->
      <div v-if="isAuthenticated" class="info-cards">
        <div class="info-card glass">
          <div class="info-icon income">+</div>
          <h3>수입 관리</h3>
          <p>급여, 부수입 등 모든 수입을 기록하세요</p>
        </div>
        <div class="info-card glass">
          <div class="info-icon expense">-</div>
          <h3>지출 관리</h3>
          <p>식비, 교통비 등 지출을 카테고리별로 관리하세요</p>
        </div>
        <div class="info-card glass">
          <div class="info-icon balance">=</div>
          <h3>잔액 확인</h3>
          <p>한눈에 보는 재정 현황으로 계획을 세우세요</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import ledgerApi from '@/api/ledgerApi';
import type { LedgerRequest } from '@/types/ledger.types';

export default defineComponent({
  name: 'LedgerCreate',
  setup() {
    const router = useRouter();
    const { isAuthenticated, restoreAuth } = useAuth();

    const submitting = ref(false);
    const error = ref<string | null>(null);

    const formData = ref<LedgerRequest>({
      name: '',
      description: '',
      currency: 'KRW',
      isDefault: true,
    });

    const currencies = [
      { code: 'KRW', symbol: '₩', name: '한국 원' },
      { code: 'USD', symbol: '$', name: '미국 달러' },
      { code: 'EUR', symbol: '€', name: '유로' },
      { code: 'JPY', symbol: '¥', name: '일본 엔' },
    ];

    const createLedger = async () => {
      if (!formData.value.name.trim()) {
        error.value = '가계부 이름을 입력해주세요.';
        return;
      }

      submitting.value = true;
      error.value = null;

      try {
        const ledger = await ledgerApi.createLedger(formData.value);
        // 생성 성공 시 해당 가계부 상세 페이지로 이동
        router.push(`/ledger/${ledger.ledgerId}`);
      } catch (err: any) {
        console.error('Failed to create ledger:', err);
        if (err.response?.status === 401) {
          error.value = '로그인이 필요합니다. Auth Service에서 로그인 후 다시 시도해주세요.';
        } else {
          error.value = err.response?.data?.error?.message || '가계부 생성에 실패했습니다.';
        }
      } finally {
        submitting.value = false;
      }
    };

    onMounted(() => {
      restoreAuth();
    });

    return {
      isAuthenticated,
      formData,
      currencies,
      submitting,
      error,
      createLedger,
    };
  },
});
</script>

<style scoped>
.ledger-create {
  min-height: calc(100vh - 60px);
  padding: 2rem;
  display: flex;
  justify-content: center;
}

.create-container {
  width: 100%;
  max-width: 600px;
}

/* Header */
.create-header {
  text-align: center;
  margin-bottom: 2rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: var(--accent-purple);
}

.back-icon {
  font-size: 1.25rem;
}

.create-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1rem;
}

/* Auth Required */
.auth-required {
  text-align: center;
  padding: 3rem;
  border-radius: var(--radius-xl);
}

.auth-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 1.5rem;
  background: rgba(168, 85, 247, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-icon svg {
  width: 32px;
  height: 32px;
  color: var(--accent-purple);
}

.auth-required h2 {
  margin-bottom: 0.5rem;
}

.auth-required p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

/* Form */
.create-form {
  padding: 2rem;
  border-radius: var(--radius-xl);
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
  position: relative;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.875rem;
}

.label-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.label-icon svg {
  width: 16px;
  height: 16px;
  color: var(--accent-purple);
}

.required {
  color: var(--accent-red);
}

.form-group input[type="text"],
.form-group textarea {
  width: 100%;
  padding: 0.875rem 1rem;
  background: var(--hover-bg);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--accent-purple);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.char-count {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

/* Currency Options */
.currency-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.currency-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: var(--hover-bg);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.currency-option:hover {
  border-color: var(--accent-purple);
}

.currency-option.selected {
  border-color: var(--accent-purple);
  background: rgba(168, 85, 247, 0.1);
}

.currency-option input {
  display: none;
}

.currency-symbol {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--accent-purple);
}

.currency-name {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Checkbox */
.checkbox-group {
  margin-top: 1.5rem;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  padding: 1rem;
  background: var(--hover-bg);
  border-radius: var(--radius-md);
  transition: background 0.2s ease;
}

.checkbox-label:hover {
  background: rgba(168, 85, 247, 0.05);
}

.checkbox-label input {
  display: none;
}

.checkbox-custom {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-subtle);
  border-radius: 4px;
  flex-shrink: 0;
  margin-top: 2px;
  transition: all 0.2s ease;
  position: relative;
}

.checkbox-label input:checked + .checkbox-custom {
  background: var(--accent-purple);
  border-color: var(--accent-purple);
}

.checkbox-label input:checked + .checkbox-custom::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 1px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.checkbox-text strong {
  color: var(--text-primary);
  font-size: 0.9375rem;
}

.checkbox-text small {
  color: var(--text-secondary);
  font-size: 0.8125rem;
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  color: var(--accent-red);
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.error-message svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* Form Actions */
.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 0.875rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-primary {
  background: var(--gradient-primary);
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-2px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: var(--hover-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
}

.btn-secondary:hover {
  background: var(--glass-border);
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Info Cards */
.info-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.info-card {
  padding: 1.25rem;
  border-radius: var(--radius-lg);
  text-align: center;
}

.info-icon {
  width: 40px;
  height: 40px;
  margin: 0 auto 0.75rem;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 700;
}

.info-icon.income {
  background: rgba(16, 185, 129, 0.2);
  color: var(--accent-green);
}

.info-icon.expense {
  background: rgba(239, 68, 68, 0.2);
  color: var(--accent-red);
}

.info-icon.balance {
  background: rgba(59, 130, 246, 0.2);
  color: var(--accent-blue);
}

.info-card h3 {
  font-size: 0.9375rem;
  margin-bottom: 0.25rem;
}

.info-card p {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Responsive */
@media (max-width: 640px) {
  .create-container {
    max-width: 100%;
  }

  .currency-options {
    grid-template-columns: 1fr;
  }

  .info-cards {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column-reverse;
  }
}
</style>
