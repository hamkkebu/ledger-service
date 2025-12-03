<template>
  <div class="ledger-detail">
    <!-- 로딩 상태 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>가계부 정보를 불러오는 중...</p>
    </div>

    <!-- 에러 상태 -->
    <div v-else-if="error" class="error-container glass">
      <h2>오류가 발생했습니다</h2>
      <p>{{ error }}</p>
      <div class="error-actions">
        <button @click="fetchLedger" class="btn-primary">다시 시도</button>
        <router-link to="/dashboard" class="btn-secondary">목록으로</router-link>
      </div>
    </div>

    <!-- 가계부 상세 정보 -->
    <div v-else-if="ledger" class="detail-content">
      <!-- 헤더 -->
      <div class="detail-header">
        <div class="header-left">
          <router-link to="/dashboard" class="back-link">
            <span class="back-icon">←</span>
            목록으로
          </router-link>
          <h1>
            {{ ledger.name }}
            <span v-if="ledger.isDefault" class="default-badge">기본</span>
          </h1>
          <p class="description">{{ ledger.description || '설명 없음' }}</p>
        </div>
        <div class="header-actions">
          <button @click="openEditModal" class="btn-secondary">
            수정
          </button>
          <button @click="showDeleteModal = true" class="btn-danger">
            삭제
          </button>
        </div>
      </div>

      <!-- 통계 카드 -->
      <div class="stats-section">
        <div class="stat-card glass">
          <div class="stat-icon income">+</div>
          <div class="stat-info">
            <span class="stat-label">총 수입</span>
            <span class="stat-value income">{{ formatCurrency(ledger.totalIncome, ledger.currency) }}</span>
          </div>
        </div>

        <div class="stat-card glass">
          <div class="stat-icon expense">-</div>
          <div class="stat-info">
            <span class="stat-label">총 지출</span>
            <span class="stat-value expense">{{ formatCurrency(ledger.totalExpense, ledger.currency) }}</span>
          </div>
        </div>

        <div class="stat-card glass">
          <div class="stat-icon balance">=</div>
          <div class="stat-info">
            <span class="stat-label">잔액</span>
            <span class="stat-value" :class="ledger.balance >= 0 ? 'positive' : 'negative'">
              {{ formatCurrency(ledger.balance, ledger.currency) }}
            </span>
          </div>
        </div>

        <div class="stat-card glass">
          <div class="stat-icon count">#</div>
          <div class="stat-info">
            <span class="stat-label">거래 수</span>
            <span class="stat-value">{{ ledger.transactionCount }}건</span>
          </div>
        </div>
      </div>

      <!-- 가계부 정보 -->
      <div class="info-section glass">
        <h2>가계부 정보</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">통화</span>
            <span class="info-value">{{ getCurrencyName(ledger.currency) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">생성일</span>
            <span class="info-value">{{ formatDate(ledger.createdAt) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">최근 수정</span>
            <span class="info-value">{{ formatDate(ledger.updatedAt) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">기본 가계부</span>
            <span class="info-value">{{ ledger.isDefault ? '예' : '아니오' }}</span>
          </div>
        </div>
      </div>

      <!-- 거래 내역 섹션 (향후 구현) -->
      <div class="transactions-section glass">
        <div class="section-header">
          <h2>거래 내역</h2>
          <button class="btn-primary" disabled>
            + 거래 추가
          </button>
        </div>
        <div class="coming-soon">
          <p>거래 내역 기능이 곧 추가됩니다.</p>
          <p class="hint">수입/지출 내역을 기록하고 관리할 수 있습니다.</p>
        </div>
      </div>
    </div>

    <!-- 수정 모달 -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
      <div class="modal glass">
        <h2>가계부 수정</h2>
        <form @submit.prevent="updateLedger">
          <div class="form-group">
            <label for="name">이름 *</label>
            <input
              id="name"
              v-model="formData.name"
              type="text"
              placeholder="가계부 이름을 입력하세요"
              required
            />
          </div>
          <div class="form-group">
            <label for="description">설명</label>
            <textarea
              id="description"
              v-model="formData.description"
              placeholder="가계부 설명을 입력하세요"
              rows="3"
            ></textarea>
          </div>
          <div class="form-group">
            <label for="currency">통화</label>
            <select id="currency" v-model="formData.currency">
              <option value="KRW">KRW (원)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>
          <div class="form-group checkbox">
            <input id="isDefault" v-model="formData.isDefault" type="checkbox" />
            <label for="isDefault">기본 가계부로 설정</label>
          </div>
          <div class="modal-actions">
            <button type="button" @click="closeEditModal" class="btn-secondary">취소</button>
            <button type="submit" class="btn-primary" :disabled="submitting">
              {{ submitting ? '저장 중...' : '저장' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 삭제 확인 모달 -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal glass">
        <h2>가계부 삭제</h2>
        <p>정말로 "{{ ledger?.name }}" 가계부를 삭제하시겠습니까?</p>
        <p class="warning">이 작업은 되돌릴 수 없으며, 모든 거래 내역도 함께 삭제됩니다.</p>
        <div class="modal-actions">
          <button @click="showDeleteModal = false" class="btn-secondary">취소</button>
          <button @click="deleteLedger" class="btn-danger" :disabled="submitting">
            {{ submitting ? '삭제 중...' : '삭제' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ledgerApi from '@/api/ledgerApi';
import type { Ledger, LedgerRequest } from '@/types/ledger.types';

export default defineComponent({
  name: 'LedgerDetail',
  setup() {
    const route = useRoute();
    const router = useRouter();

    const ledger = ref<Ledger | null>(null);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const submitting = ref(false);

    const showEditModal = ref(false);
    const showDeleteModal = ref(false);

    const formData = ref<LedgerRequest>({
      name: '',
      description: '',
      currency: 'KRW',
      isDefault: false,
    });

    const ledgerId = computed(() => Number(route.params.id));

    const fetchLedger = async () => {
      loading.value = true;
      error.value = null;

      try {
        ledger.value = await ledgerApi.getLedger(ledgerId.value);
      } catch (err: any) {
        console.error('Failed to fetch ledger:', err);
        if (err.response?.status === 401) {
          error.value = '로그인이 필요합니다.';
        } else if (err.response?.status === 404) {
          error.value = '가계부를 찾을 수 없습니다.';
        } else {
          error.value = err.response?.data?.error?.message || '가계부 정보를 불러오는데 실패했습니다.';
        }
      } finally {
        loading.value = false;
      }
    };

    const formatCurrency = (amount: number, currency = 'KRW'): string => {
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: currency,
      }).format(amount || 0);
    };

    const formatDate = (dateString: string): string => {
      return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const getCurrencyName = (currency: string): string => {
      const currencyNames: Record<string, string> = {
        KRW: 'KRW (원)',
        USD: 'USD ($)',
        EUR: 'EUR (€)',
        JPY: 'JPY (¥)',
      };
      return currencyNames[currency] || currency;
    };

    const openEditModal = () => {
      if (ledger.value) {
        formData.value = {
          name: ledger.value.name,
          description: ledger.value.description || '',
          currency: ledger.value.currency,
          isDefault: ledger.value.isDefault,
        };
        showEditModal.value = true;
      }
    };

    const closeEditModal = () => {
      showEditModal.value = false;
    };

    const updateLedger = async () => {
      submitting.value = true;

      try {
        ledger.value = await ledgerApi.updateLedger(ledgerId.value, formData.value);
        closeEditModal();
      } catch (err: any) {
        console.error('Failed to update ledger:', err);
        alert(err.response?.data?.error?.message || '수정에 실패했습니다.');
      } finally {
        submitting.value = false;
      }
    };

    const deleteLedger = async () => {
      submitting.value = true;

      try {
        await ledgerApi.deleteLedger(ledgerId.value);
        router.push('/dashboard');
      } catch (err: any) {
        console.error('Failed to delete ledger:', err);
        alert(err.response?.data?.error?.message || '삭제에 실패했습니다.');
      } finally {
        submitting.value = false;
      }
    };

    onMounted(() => {
      fetchLedger();
    });

    // Watch for edit modal to populate form
    const startEdit = () => {
      if (ledger.value) {
        formData.value = {
          name: ledger.value.name,
          description: ledger.value.description || '',
          currency: ledger.value.currency,
          isDefault: ledger.value.isDefault,
        };
      }
      showEditModal.value = true;
    };

    return {
      ledger,
      loading,
      error,
      submitting,
      showEditModal,
      showDeleteModal,
      formData,
      fetchLedger,
      formatCurrency,
      formatDate,
      getCurrencyName,
      openEditModal,
      closeEditModal,
      updateLedger,
      deleteLedger,
    };
  },
});
</script>

<style scoped>
.ledger-detail {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-subtle);
  border-top-color: var(--accent-purple);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-container {
  text-align: center;
  padding: 3rem;
  border-radius: var(--radius-xl);
  max-width: 500px;
  margin: 4rem auto;
}

.error-container h2 {
  margin-bottom: 1rem;
  color: var(--accent-red);
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.5rem;
}

/* Header */
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  flex: 1;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: var(--accent-purple);
}

.back-icon {
  font-size: 1.25rem;
}

.detail-header h1 {
  font-size: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.default-badge {
  background: var(--gradient-primary);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
}

.description {
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

/* Stats Section */
.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: var(--radius-lg);
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
}

.stat-icon.income { background: rgba(16, 185, 129, 0.2); color: var(--accent-green); }
.stat-icon.expense { background: rgba(239, 68, 68, 0.2); color: var(--accent-red); }
.stat-icon.balance { background: rgba(59, 130, 246, 0.2); color: var(--accent-blue); }
.stat-icon.count { background: rgba(168, 85, 247, 0.2); color: var(--accent-purple); }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
}

.stat-value.income, .positive { color: var(--accent-green); }
.stat-value.expense, .negative { color: var(--accent-red); }

/* Info Section */
.info-section {
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  margin-bottom: 2rem;
}

.info-section h2 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  color: var(--text-tertiary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  color: var(--text-primary);
  font-weight: 500;
}

/* Transactions Section */
.transactions-section {
  padding: 1.5rem;
  border-radius: var(--radius-lg);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h2 {
  font-size: 1.25rem;
}

.coming-soon {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.coming-soon .hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  color: var(--text-tertiary);
}

/* Buttons */
.btn-primary {
  background: var(--gradient-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
  text-decoration: none;
  display: inline-block;
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
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  text-decoration: none;
  display: inline-block;
}

.btn-secondary:hover {
  background: var(--glass-border);
}

.btn-danger {
  background: var(--gradient-error);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 480px;
  padding: 2rem;
  border-radius: var(--radius-xl);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal h2 {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.form-group input[type="text"],
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  background: var(--hover-bg);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--accent-purple);
}

.form-group.checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-group.checkbox input {
  width: auto;
}

.form-group.checkbox label {
  margin: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.warning {
  color: var(--accent-red);
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

/* Responsive */
@media (max-width: 640px) {
  .detail-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions button {
    flex: 1;
  }
}
</style>
