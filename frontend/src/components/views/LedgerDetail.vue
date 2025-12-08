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
            <span class="stat-value income">{{ formatCurrency(transactionSummary?.totalIncome || ledger.totalIncome, ledger.currency) }}</span>
          </div>
        </div>

        <div class="stat-card glass">
          <div class="stat-icon expense">-</div>
          <div class="stat-info">
            <span class="stat-label">총 지출</span>
            <span class="stat-value expense">{{ formatCurrency(transactionSummary?.totalExpense || ledger.totalExpense, ledger.currency) }}</span>
          </div>
        </div>

        <div class="stat-card glass">
          <div class="stat-icon balance">=</div>
          <div class="stat-info">
            <span class="stat-label">잔액</span>
            <span class="stat-value" :class="(transactionSummary?.balance || ledger.balance) >= 0 ? 'positive' : 'negative'">
              {{ formatCurrency(transactionSummary?.balance || ledger.balance, ledger.currency) }}
            </span>
          </div>
        </div>

        <div class="stat-card glass">
          <div class="stat-icon count">#</div>
          <div class="stat-info">
            <span class="stat-label">거래 수</span>
            <span class="stat-value">{{ transactionSummary?.transactionCount || ledger.transactionCount }}건</span>
          </div>
        </div>
      </div>

      <!-- 거래 내역 섹션 -->
      <div class="transactions-section glass">
        <div class="section-header">
          <h2>거래 내역</h2>
          <button class="btn-primary" @click="openTransactionModal()">
            + 거래 추가
          </button>
        </div>

        <!-- 기간 선택 UI -->
        <div class="period-selector">
          <div class="period-type-buttons">
            <button
              v-for="type in periodTypes"
              :key="type.value"
              :class="['period-type-btn', { active: selectedPeriodType === type.value }]"
              @click="changePeriodType(type.value)"
            >
              {{ type.label }}
            </button>
          </div>

          <div class="period-navigator">
            <button class="nav-btn" @click="navigatePeriod(-1)">
              ←
            </button>
            <span class="current-period">{{ currentPeriodLabel }}</span>
            <button class="nav-btn" @click="navigatePeriod(1)" :disabled="isCurrentPeriod">
              →
            </button>
          </div>
        </div>

        <!-- 기간별 요약 (월별/년별 조회 시) -->
        <div v-if="periodSummary?.periodDetails && periodSummary.periodDetails.length > 0" class="period-details">
          <div
            v-for="detail in periodSummary.periodDetails"
            :key="detail.periodLabel"
            class="period-detail-item"
          >
            <span class="period-label">{{ formatPeriodLabel(detail.periodLabel) }}</span>
            <span class="period-income">+{{ formatCurrency(detail.income, ledger.currency) }}</span>
            <span class="period-expense">-{{ formatCurrency(detail.expense, ledger.currency) }}</span>
            <span class="period-balance" :class="detail.balance >= 0 ? 'positive' : 'negative'">
              {{ formatCurrency(detail.balance, ledger.currency) }}
            </span>
          </div>
        </div>

        <!-- 거래 로딩 -->
        <div v-if="transactionsLoading" class="transactions-loading">
          <div class="loading-spinner small"></div>
          <p>거래 내역을 불러오는 중...</p>
        </div>

        <!-- 거래 목록 -->
        <div v-else-if="transactions.length > 0" class="transactions-list">
          <div
            v-for="transaction in transactions"
            :key="transaction.id"
            class="transaction-item"
            @click="openTransactionModal(transaction)"
          >
            <div class="transaction-main">
              <div class="transaction-type" :class="transaction.type.toLowerCase()">
                {{ transaction.type === 'INCOME' ? '+' : '-' }}
              </div>
              <div class="transaction-info">
                <span class="transaction-description">
                  {{ transaction.description || (transaction.type === 'INCOME' ? '수입' : '지출') }}
                </span>
                <span class="transaction-meta">
                  {{ transaction.category || '미분류' }} · {{ formatSimpleDate(transaction.transactionDate) }}
                </span>
              </div>
            </div>
            <div class="transaction-amount" :class="transaction.type.toLowerCase()">
              {{ transaction.type === 'INCOME' ? '+' : '-' }}{{ formatCurrency(transaction.amount, ledger.currency) }}
            </div>
          </div>
        </div>

        <!-- 거래 없음 -->
        <div v-else class="no-transactions">
          <p>아직 거래 내역이 없습니다.</p>
          <p class="hint">위의 '거래 추가' 버튼을 클릭하여 첫 거래를 기록해보세요.</p>
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

    <!-- 거래 추가/수정 모달 -->
    <div v-if="showTransactionModal" class="modal-overlay" @click.self="closeTransactionModal">
      <div class="modal glass">
        <h2>{{ editingTransaction ? '거래 수정' : '거래 추가' }}</h2>
        <form @submit.prevent="saveTransaction">
          <div class="form-group">
            <label>거래 유형 *</label>
            <div class="type-selector">
              <button
                type="button"
                class="type-btn income"
                :class="{ active: transactionFormData.type === 'INCOME' }"
                @click="transactionFormData.type = 'INCOME'"
              >
                수입
              </button>
              <button
                type="button"
                class="type-btn expense"
                :class="{ active: transactionFormData.type === 'EXPENSE' }"
                @click="transactionFormData.type = 'EXPENSE'"
              >
                지출
              </button>
            </div>
          </div>
          <div class="form-group">
            <label for="amount">금액 *</label>
            <input
              id="amount"
              v-model.number="transactionFormData.amount"
              type="number"
              placeholder="금액을 입력하세요"
              min="1"
              step="1"
              required
            />
          </div>
          <div class="form-group">
            <label for="transactionDate">날짜 *</label>
            <input
              id="transactionDate"
              v-model="transactionFormData.transactionDate"
              type="date"
              required
            />
          </div>
          <div class="form-group">
            <label for="txDescription">설명</label>
            <input
              id="txDescription"
              v-model="transactionFormData.description"
              type="text"
              placeholder="거래 설명을 입력하세요"
            />
          </div>
          <div class="form-group">
            <label for="category">카테고리</label>
            <select id="category" v-model="transactionFormData.category">
              <option value="">선택하세요</option>
              <optgroup v-if="transactionFormData.type === 'INCOME'" label="수입">
                <option value="급여">급여</option>
                <option value="부수입">부수입</option>
                <option value="용돈">용돈</option>
                <option value="투자수익">투자수익</option>
                <option value="기타수입">기타수입</option>
              </optgroup>
              <optgroup v-else label="지출">
                <option value="식비">식비</option>
                <option value="교통비">교통비</option>
                <option value="주거비">주거비</option>
                <option value="의료비">의료비</option>
                <option value="문화생활">문화생활</option>
                <option value="쇼핑">쇼핑</option>
                <option value="통신비">통신비</option>
                <option value="기타지출">기타지출</option>
              </optgroup>
            </select>
          </div>
          <div class="form-group">
            <label for="memo">메모</label>
            <textarea
              id="memo"
              v-model="transactionFormData.memo"
              placeholder="메모를 입력하세요"
              rows="2"
            ></textarea>
          </div>
          <div class="modal-actions">
            <button
              v-if="editingTransaction"
              type="button"
              @click="deleteTransaction"
              class="btn-danger"
              :disabled="transactionSubmitting"
            >
              삭제
            </button>
            <div class="spacer"></div>
            <button type="button" @click="closeTransactionModal" class="btn-secondary">취소</button>
            <button type="submit" class="btn-primary" :disabled="transactionSubmitting">
              {{ transactionSubmitting ? '저장 중...' : '저장' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ledgerApi from '@/api/ledgerApi';
import transactionApi, { setTransactionTokenProvider } from '@/api/transactionApi';
import type { Ledger, LedgerRequest } from '@/types/ledger.types';
import type { Transaction, TransactionRequest, TransactionSummary, TransactionType, PeriodTransactionSummary, PeriodType } from '@/types/transaction.types';
import { useAuth } from '@/composables/useAuth';

export default defineComponent({
  name: 'LedgerDetail',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const { getToken } = useAuth();

    // 토큰 제공자 설정
    setTransactionTokenProvider(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });

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

    // 거래 관련 상태
    const transactions = ref<Transaction[]>([]);
    const transactionSummary = ref<TransactionSummary | null>(null);
    const transactionsLoading = ref(false);
    const showTransactionModal = ref(false);
    const editingTransaction = ref<Transaction | null>(null);
    const transactionSubmitting = ref(false);

    // 기간별 조회 상태
    const periodTypes = [
      { value: 'YEARLY' as const, label: '년' },
      { value: 'MONTHLY' as const, label: '월' },
      { value: 'DAILY' as const, label: '일' },
    ];
    const selectedPeriodType = ref<'DAILY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
    const selectedDate = ref(new Date());
    const periodSummary = ref<PeriodTransactionSummary | null>(null);

    const transactionFormData = ref<{
      type: TransactionType;
      amount: number;
      description: string;
      category: string;
      transactionDate: string;
      memo: string;
    }>({
      type: 'EXPENSE',
      amount: 0,
      description: '',
      category: '',
      transactionDate: new Date().toISOString().split('T')[0],
      memo: '',
    });

    const ledgerId = computed(() => Number(route.params.id));

    const fetchLedger = async () => {
      loading.value = true;
      error.value = null;

      try {
        ledger.value = await ledgerApi.getLedger(ledgerId.value);
        // 거래 내역도 함께 로드
        await fetchTransactions();
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

    const fetchTransactions = async () => {
      transactionsLoading.value = true;
      try {
        const date = selectedDate.value;

        switch (selectedPeriodType.value) {
          case 'DAILY': {
            const dateStr = date.toISOString().split('T')[0];
            const summary = await transactionApi.getDailySummary(ledgerId.value, dateStr);
            periodSummary.value = summary;
            transactions.value = summary.transactions || [];
            transactionSummary.value = {
              ledgerId: summary.ledgerId,
              totalIncome: summary.totalIncome,
              totalExpense: summary.totalExpense,
              balance: summary.balance,
              transactionCount: summary.transactionCount,
            };
            break;
          }
          case 'YEARLY': {
            const summary = await transactionApi.getYearlySummary(ledgerId.value, date.getFullYear());
            periodSummary.value = summary;
            transactions.value = summary.transactions || [];
            transactionSummary.value = {
              ledgerId: summary.ledgerId,
              totalIncome: summary.totalIncome,
              totalExpense: summary.totalExpense,
              balance: summary.balance,
              transactionCount: summary.transactionCount,
            };
            break;
          }
          case 'MONTHLY':
          default: {
            const summary = await transactionApi.getMonthlySummary(
              ledgerId.value,
              date.getFullYear(),
              date.getMonth() + 1
            );
            periodSummary.value = summary;
            transactions.value = summary.transactions || [];
            transactionSummary.value = {
              ledgerId: summary.ledgerId,
              totalIncome: summary.totalIncome,
              totalExpense: summary.totalExpense,
              balance: summary.balance,
              transactionCount: summary.transactionCount,
            };
            break;
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch transactions:', err);
        // 거래 조회 실패 시 조용히 실패 (가계부 정보는 표시)
        transactions.value = [];
        periodSummary.value = null;
      } finally {
        transactionsLoading.value = false;
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

    const formatSimpleDate = (dateString: string): string => {
      return new Date(dateString).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      });
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

    // 거래 관련 함수
    const openTransactionModal = (transaction?: Transaction) => {
      if (transaction) {
        editingTransaction.value = transaction;
        transactionFormData.value = {
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description || '',
          category: transaction.category || '',
          transactionDate: transaction.transactionDate,
          memo: transaction.memo || '',
        };
      } else {
        editingTransaction.value = null;
        transactionFormData.value = {
          type: 'EXPENSE',
          amount: 0,
          description: '',
          category: '',
          transactionDate: new Date().toISOString().split('T')[0],
          memo: '',
        };
      }
      showTransactionModal.value = true;
    };

    const closeTransactionModal = () => {
      showTransactionModal.value = false;
      editingTransaction.value = null;
    };

    const saveTransaction = async () => {
      transactionSubmitting.value = true;

      try {
        const request: TransactionRequest = {
          ledgerId: ledgerId.value,
          type: transactionFormData.value.type,
          amount: transactionFormData.value.amount,
          description: transactionFormData.value.description || undefined,
          category: transactionFormData.value.category || undefined,
          transactionDate: transactionFormData.value.transactionDate,
          memo: transactionFormData.value.memo || undefined,
        };

        if (editingTransaction.value) {
          await transactionApi.updateTransaction(editingTransaction.value.id, request);
        } else {
          await transactionApi.createTransaction(request);
        }

        closeTransactionModal();
        await fetchTransactions();
      } catch (err: any) {
        console.error('Failed to save transaction:', err);
        alert(err.response?.data?.error?.message || '저장에 실패했습니다.');
      } finally {
        transactionSubmitting.value = false;
      }
    };

    const deleteTransaction = async () => {
      if (!editingTransaction.value) return;

      if (!confirm('정말로 이 거래를 삭제하시겠습니까?')) return;

      transactionSubmitting.value = true;

      try {
        await transactionApi.deleteTransaction(editingTransaction.value.id);
        closeTransactionModal();
        await fetchTransactions();
      } catch (err: any) {
        console.error('Failed to delete transaction:', err);
        alert(err.response?.data?.error?.message || '삭제에 실패했습니다.');
      } finally {
        transactionSubmitting.value = false;
      }
    };

    // 기간별 조회 관련 computed
    const currentPeriodLabel = computed(() => {
      const date = selectedDate.value;
      switch (selectedPeriodType.value) {
        case 'DAILY':
          return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
        case 'YEARLY':
          return `${date.getFullYear()}년`;
        case 'MONTHLY':
        default:
          return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
      }
    });

    const isCurrentPeriod = computed(() => {
      const now = new Date();
      const date = selectedDate.value;
      switch (selectedPeriodType.value) {
        case 'DAILY':
          return date.toDateString() === now.toDateString();
        case 'YEARLY':
          return date.getFullYear() === now.getFullYear();
        case 'MONTHLY':
        default:
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      }
    });

    // 기간 유형 변경
    const changePeriodType = async (type: 'DAILY' | 'MONTHLY' | 'YEARLY') => {
      selectedPeriodType.value = type;
      selectedDate.value = new Date();
      await fetchTransactions();
    };

    // 기간 이동
    const navigatePeriod = async (direction: number) => {
      const date = new Date(selectedDate.value);
      switch (selectedPeriodType.value) {
        case 'DAILY':
          date.setDate(date.getDate() + direction);
          break;
        case 'MONTHLY':
          date.setMonth(date.getMonth() + direction);
          break;
        case 'YEARLY':
          date.setFullYear(date.getFullYear() + direction);
          break;
      }
      selectedDate.value = date;
      await fetchTransactions();
    };

    // 기간 라벨 포맷
    const formatPeriodLabel = (label: string): string => {
      if (label.length === 10) {
        // yyyy-MM-dd 형식 (일별)
        const [year, month, day] = label.split('-');
        return `${month}월 ${day}일`;
      } else if (label.length === 7) {
        // yyyy-MM 형식 (월별)
        const [year, month] = label.split('-');
        return `${month}월`;
      }
      return label;
    };

    onMounted(() => {
      fetchLedger();
    });

    return {
      ledger,
      loading,
      error,
      submitting,
      showEditModal,
      showDeleteModal,
      formData,
      transactions,
      transactionSummary,
      transactionsLoading,
      showTransactionModal,
      editingTransaction,
      transactionSubmitting,
      transactionFormData,
      // 기간별 조회 관련
      periodTypes,
      selectedPeriodType,
      selectedDate,
      periodSummary,
      currentPeriodLabel,
      isCurrentPeriod,
      changePeriodType,
      navigatePeriod,
      formatPeriodLabel,
      // 함수들
      fetchLedger,
      formatCurrency,
      formatDate,
      formatSimpleDate,
      openEditModal,
      closeEditModal,
      updateLedger,
      deleteLedger,
      openTransactionModal,
      closeTransactionModal,
      saveTransaction,
      deleteTransaction,
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

.loading-spinner.small {
  width: 24px;
  height: 24px;
  border-width: 2px;
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

.transactions-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--hover-bg);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.2s ease;
}

.transaction-item:hover {
  background: var(--glass-border);
}

.transaction-main {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.transaction-type {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.25rem;
}

.transaction-type.income {
  background: rgba(16, 185, 129, 0.2);
  color: var(--accent-green);
}

.transaction-type.expense {
  background: rgba(239, 68, 68, 0.2);
  color: var(--accent-red);
}

.transaction-info {
  display: flex;
  flex-direction: column;
}

.transaction-description {
  font-weight: 500;
}

.transaction-meta {
  font-size: 0.875rem;
  color: var(--text-tertiary);
}

.transaction-amount {
  font-weight: 600;
  font-size: 1.125rem;
}

.transaction-amount.income {
  color: var(--accent-green);
}

.transaction-amount.expense {
  color: var(--accent-red);
}

.no-transactions {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.no-transactions .hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  color: var(--text-tertiary);
}

/* Period Selector */
.period-selector {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--hover-bg);
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
}

.period-type-buttons {
  display: flex;
  gap: 0.5rem;
}

.period-type-btn {
  flex: 1;
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.period-type-btn:hover {
  background: var(--glass-border);
}

.period-type-btn.active {
  background: var(--gradient-primary);
  color: white;
  border-color: transparent;
}

.period-navigator {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}

.nav-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-primary);
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover:not(:disabled) {
  background: var(--glass-border);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.current-period {
  font-size: 1.125rem;
  font-weight: 600;
  min-width: 150px;
  text-align: center;
}

/* Period Details */
.period-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--hover-bg);
  border-radius: var(--radius-md);
}

.period-detail-item {
  display: grid;
  grid-template-columns: 1fr repeat(3, auto);
  gap: 1rem;
  padding: 0.75rem;
  background: var(--glass-bg);
  border-radius: var(--radius-sm);
  align-items: center;
  font-size: 0.875rem;
}

.period-label {
  font-weight: 500;
}

.period-income {
  color: var(--accent-green);
  text-align: right;
}

.period-expense {
  color: var(--accent-red);
  text-align: right;
}

.period-balance {
  font-weight: 600;
  text-align: right;
  min-width: 100px;
}

.period-balance.positive {
  color: var(--accent-green);
}

.period-balance.negative {
  color: var(--accent-red);
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
  max-height: 90vh;
  overflow-y: auto;
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
.form-group input[type="number"],
.form-group input[type="date"],
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

.type-selector {
  display: flex;
  gap: 0.5rem;
}

.type-btn {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--hover-bg);
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-btn.income.active {
  border-color: var(--accent-green);
  background: rgba(16, 185, 129, 0.2);
  color: var(--accent-green);
}

.type-btn.expense.active {
  border-color: var(--accent-red);
  background: rgba(239, 68, 68, 0.2);
  color: var(--accent-red);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.modal-actions .spacer {
  flex: 1;
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
