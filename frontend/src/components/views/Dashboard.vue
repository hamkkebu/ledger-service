<template>
  <div class="dashboard">
    <!-- 로딩 상태 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>가계부 현황을 불러오는 중...</p>
    </div>

    <!-- 에러 상태 -->
    <div v-else-if="error" class="error-container glass">
      <h2>오류가 발생했습니다</h2>
      <p>{{ error }}</p>
      <button @click="fetchSummary" class="btn-primary">다시 시도</button>
    </div>

    <!-- 인증 필요 -->
    <div v-else-if="!isAuthenticated" class="auth-required glass">
      <h2>로그인이 필요합니다</h2>
      <p>가계부를 확인하려면 먼저 로그인해주세요.</p>
      <p class="info-text">로그인 후 이 페이지로 돌아오면 가계부를 확인할 수 있습니다.</p>
    </div>

    <!-- 대시보드 콘텐츠 -->
    <div v-else-if="summary" class="dashboard-content">
      <!-- 헤더 -->
      <div class="dashboard-header">
        <h1>안녕하세요, <span class="gradient-text">{{ summary.username }}</span>님!</h1>
        <p class="subtitle">가계부 현황을 확인하세요</p>
      </div>

      <!-- 요약 카드 -->
      <div class="summary-cards">
        <div class="summary-card glass">
          <div class="card-icon count">
            <span>#</span>
          </div>
          <div class="card-content">
            <p class="card-label">가계부 수</p>
            <p class="card-value">{{ summary.totalLedgerCount }}개</p>
          </div>
        </div>
      </div>

      <!-- 가계부 목록 -->
      <div class="ledger-section">
        <div class="section-header">
          <h2>내 가계부</h2>
          <router-link to="/create" class="btn-primary">
            + 새 가계부
          </router-link>
        </div>

        <div v-if="summary.ledgers.length === 0" class="empty-state glass">
          <p>아직 가계부가 없습니다.</p>
          <p>새 가계부를 만들어 수입과 지출을 관리해보세요!</p>
        </div>

        <div v-else class="ledger-grid">
          <div
            v-for="ledger in summary.ledgers"
            :key="ledger.ledgerId"
            class="ledger-card glass"
            :class="{ 'is-default': ledger.isDefault }"
            @click="goToLedger(ledger.ledgerId)"
          >
            <div class="ledger-header">
              <h3>{{ ledger.name }}</h3>
              <span v-if="ledger.isDefault" class="default-badge">기본</span>
            </div>
            <p class="ledger-description">{{ ledger.description || '설명 없음' }}</p>

            <div class="ledger-stats">
              <div class="stat">
                <span class="stat-label">수입</span>
                <span class="stat-value income">{{ formatCurrency(ledger.totalIncome) }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">지출</span>
                <span class="stat-value expense">{{ formatCurrency(ledger.totalExpense) }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">잔액</span>
                <span class="stat-value" :class="ledger.balance >= 0 ? 'positive' : 'negative'">
                  {{ formatCurrency(ledger.balance) }}
                </span>
              </div>
            </div>

            <div class="ledger-footer">
              <span class="transaction-count">{{ ledger.transactionCount }}건의 거래</span>
              <span class="currency-badge">{{ ledger.currency }}</span>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- 생성/수정 모달 -->
    <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal glass">
        <h2>{{ showEditModal ? '가계부 수정' : '새 가계부 만들기' }}</h2>
        <form @submit.prevent="submitForm">
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
            <button type="button" @click="closeModal" class="btn-secondary">취소</button>
            <button type="submit" class="btn-primary" :disabled="submitting">
              {{ submitting ? '처리 중...' : (showEditModal ? '수정' : '만들기') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 삭제 확인 모달 -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal glass">
        <h2>가계부 삭제</h2>
        <p>정말로 "{{ ledgerToDelete?.name }}" 가계부를 삭제하시겠습니까?</p>
        <p class="warning">이 작업은 되돌릴 수 없습니다.</p>
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
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import ledgerApi from '@/api/ledgerApi';
import type { LedgerSummary, Ledger, LedgerRequest } from '@/types/ledger.types';

export default defineComponent({
  name: 'LedgerDashboard',
  setup() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    const summary = ref<LedgerSummary | null>(null);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const submitting = ref(false);

    // 모달 상태
    const showCreateModal = ref(false);
    const showEditModal = ref(false);
    const showDeleteModal = ref(false);
    const editingLedger = ref<Ledger | null>(null);
    const ledgerToDelete = ref<Ledger | null>(null);

    // 폼 데이터
    const formData = ref<LedgerRequest>({
      name: '',
      description: '',
      currency: 'KRW',
      isDefault: false,
    });

    const fetchSummary = async () => {
      loading.value = true;
      error.value = null;

      try {
        summary.value = await ledgerApi.getSummary();
      } catch (err: any) {
        console.error('Failed to fetch summary:', err);
        if (err.response?.status === 401) {
          error.value = '로그인이 필요합니다.';
        } else {
          error.value = err.response?.data?.error?.message || '가계부 정보를 불러오는데 실패했습니다.';
        }
      } finally {
        loading.value = false;
      }
    };

    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
      }).format(amount || 0);
    };

    const resetForm = () => {
      formData.value = {
        name: '',
        description: '',
        currency: 'KRW',
        isDefault: false,
      };
    };

    const closeModal = () => {
      showCreateModal.value = false;
      showEditModal.value = false;
      editingLedger.value = null;
      resetForm();
    };

    const editLedger = (ledger: Ledger) => {
      editingLedger.value = ledger;
      formData.value = {
        name: ledger.name,
        description: ledger.description || '',
        currency: ledger.currency,
        isDefault: ledger.isDefault,
      };
      showEditModal.value = true;
    };

    const confirmDelete = (ledger: Ledger) => {
      ledgerToDelete.value = ledger;
      showDeleteModal.value = true;
    };

    const submitForm = async () => {
      submitting.value = true;

      try {
        if (showEditModal.value && editingLedger.value) {
          await ledgerApi.updateLedger(editingLedger.value.ledgerId, formData.value);
        } else {
          await ledgerApi.createLedger(formData.value);
        }
        closeModal();
        await fetchSummary();
      } catch (err: any) {
        console.error('Failed to submit:', err);
        alert(err.response?.data?.error?.message || '저장에 실패했습니다.');
      } finally {
        submitting.value = false;
      }
    };

    const deleteLedger = async () => {
      if (!ledgerToDelete.value) return;

      submitting.value = true;

      try {
        await ledgerApi.deleteLedger(ledgerToDelete.value.ledgerId);
        showDeleteModal.value = false;
        ledgerToDelete.value = null;
        await fetchSummary();
      } catch (err: any) {
        console.error('Failed to delete:', err);
        alert(err.response?.data?.error?.message || '삭제에 실패했습니다.');
      } finally {
        submitting.value = false;
      }
    };

    const goToLedger = (ledgerId: number) => {
      router.push(`/ledger/${ledgerId}`);
    };

    onMounted(() => {
      if (isAuthenticated.value) {
        fetchSummary();
      } else {
        loading.value = false;
      }
    });

    return {
      summary,
      loading,
      error,
      isAuthenticated,
      showCreateModal,
      showEditModal,
      showDeleteModal,
      formData,
      submitting,
      ledgerToDelete,
      fetchSummary,
      formatCurrency,
      closeModal,
      editLedger,
      confirmDelete,
      submitForm,
      deleteLedger,
      goToLedger,
    };
  },
});
</script>

<style scoped>
.dashboard {
  padding: 2rem;
  max-width: 1400px;
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

.error-container,
.auth-required {
  text-align: center;
  padding: 3rem;
  border-radius: var(--radius-xl);
  max-width: 500px;
  margin: 4rem auto;
}

.error-container h2,
.auth-required h2 {
  margin-bottom: 1rem;
  color: var(--accent-red);
}

.auth-required h2 {
  color: var(--text-primary);
}

.info-text {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-top: 1rem;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--text-secondary);
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  transition: transform 0.2s ease;
}

.summary-card:hover {
  transform: translateY(-4px);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
}

.card-icon.income { background: rgba(16, 185, 129, 0.2); color: var(--accent-green); }
.card-icon.expense { background: rgba(239, 68, 68, 0.2); color: var(--accent-red); }
.card-icon.balance { background: rgba(59, 130, 246, 0.2); color: var(--accent-blue); }
.card-icon.count { background: rgba(168, 85, 247, 0.2); color: var(--accent-purple); }

.card-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.card-value {
  font-size: 1.25rem;
  font-weight: 600;
}

.card-value.income, .stat-value.income, .positive { color: var(--accent-green); }
.card-value.expense, .stat-value.expense, .negative { color: var(--accent-red); }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  font-size: 1.5rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
}

.ledger-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.ledger-card {
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.ledger-card:hover {
  transform: translateY(-4px);
}

.ledger-card.is-default {
  border: 1px solid var(--accent-purple);
}

.ledger-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.ledger-header h3 {
  font-size: 1.125rem;
}

.default-badge {
  background: var(--gradient-primary);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
}

.ledger-description {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.ledger-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--hover-bg);
  border-radius: var(--radius-md);
}

.stat {
  text-align: center;
}

.stat-label {
  display: block;
  color: var(--text-tertiary);
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-weight: 600;
  font-size: 0.875rem;
}

.ledger-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-tertiary);
  font-size: 0.75rem;
}

.currency-badge {
  background: var(--hover-bg);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
}

/* 버튼 스타일 */
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

.btn-primary:hover {
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

/* 모달 */
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
</style>
