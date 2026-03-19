import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ledgerApi from '@/api/ledgerApi';
import transactionApi from '@/api/transactionApi';
import { categoryApi } from '@/api/categoryApi';
import { useAuth } from '@/composables/useAuth';
import type { Ledger, LedgerRequest } from '@/types/ledger.types';
import type {
  Transaction,
  TransactionRequest,
  TransactionSummary,
  TransactionType,
  PeriodTransactionSummary,
} from '@/types/transaction.types';
import type { Category } from '@/types/category.types';
import styles from './LedgerDetail.module.css';

const periodTypes = [
  { value: 'YEARLY' as const, label: '년' },
  { value: 'MONTHLY' as const, label: '월' },
  { value: 'DAILY' as const, label: '일' },
];

export default function LedgerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const ledgerId = parseInt(id || '0', 10);

  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [formData, setFormData] = useState<LedgerRequest>({
    name: '',
    description: '',
    currency: 'KRW',
    isDefault: false,
  });

  // Transaction states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionSubmitting, setTransactionSubmitting] = useState(false);

  // Category states
  const [categories, setCategories] = useState<Category[]>([]);

  // Period states
  const [selectedPeriodType, setSelectedPeriodType] = useState<'DAILY' | 'MONTHLY' | 'YEARLY'>(
    'MONTHLY'
  );
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [transactionFormData, setTransactionFormData] = useState<{
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

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => c.type === transactionFormData.type);
  }, [categories, transactionFormData.type]);

  const currentPeriodLabel = useMemo(() => {
    const date = selectedDate;
    switch (selectedPeriodType) {
      case 'DAILY':
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
      case 'YEARLY':
        return `${date.getFullYear()}년`;
      case 'MONTHLY':
      default:
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
    }
  }, [selectedDate, selectedPeriodType]);

  const isCurrentPeriod = useMemo(() => {
    const now = new Date();
    const date = selectedDate;
    switch (selectedPeriodType) {
      case 'DAILY':
        return date.toDateString() === now.toDateString();
      case 'YEARLY':
        return date.getFullYear() === now.getFullYear();
      case 'MONTHLY':
      default:
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }
  }, [selectedDate, selectedPeriodType]);

  const fetchCategories = async () => {
    try {
      const allCategories = await categoryApi.getCategories(ledgerId);
      const flatList: Category[] = [];
      const flatten = (cats: Category[]) => {
        cats.forEach((cat) => {
          flatList.push(cat);
          if (cat.children && cat.children.length > 0) {
            flatten(cat.children);
          }
        });
      };
      flatten(allCategories);
      setCategories(flatList);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await ledgerApi.getLedger(ledgerId);
      setLedger(data);
      await fetchTransactions();
    } catch (err: any) {
      console.error('Failed to fetch ledger:', err);
      if (err.response?.status === 401) {
        setError('로그인이 필요합니다.');
      } else if (err.response?.status === 404) {
        setError('가계부를 찾을 수 없습니다.');
      } else {
        setError(
          err.response?.data?.error?.message || '가계부 정보를 불러오는데 실패했습니다.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const date = selectedDate;

      switch (selectedPeriodType) {
        case 'DAILY': {
          const dateStr = date.toISOString().split('T')[0];
          const summary = await transactionApi.getDailySummary(ledgerId, dateStr);
          setTransactions(summary.transactions || []);
          setTransactionSummary({
            ledgerId: summary.ledgerId,
            totalIncome: summary.totalIncome,
            totalExpense: summary.totalExpense,
            balance: summary.balance,
            transactionCount: summary.transactionCount,
          });
          break;
        }
        case 'YEARLY': {
          const summary = await transactionApi.getYearlySummary(
            ledgerId,
            date.getFullYear()
          );
          setTransactions(summary.transactions || []);
          setTransactionSummary({
            ledgerId: summary.ledgerId,
            totalIncome: summary.totalIncome,
            totalExpense: summary.totalExpense,
            balance: summary.balance,
            transactionCount: summary.transactionCount,
          });
          break;
        }
        case 'MONTHLY':
        default: {
          const summary = await transactionApi.getMonthlySummary(
            ledgerId,
            date.getFullYear(),
            date.getMonth() + 1
          );
          setTransactions(summary.transactions || []);
          setTransactionSummary({
            ledgerId: summary.ledgerId,
            totalIncome: summary.totalIncome,
            totalExpense: summary.totalExpense,
            balance: summary.balance,
            transactionCount: summary.transactionCount,
          });
          break;
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
      setTransactions([]);
      setTransactionSummary(null);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency = 'KRW'): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency,
    }).format(amount || 0);
  };

  const formatSimpleDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  const openEditModal = () => {
    if (ledger) {
      setFormData({
        name: ledger.name,
        description: ledger.description || '',
        currency: ledger.currency,
        isDefault: ledger.isDefault,
      });
      setShowEditModal(true);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
  };

  const updateLedger = async () => {
    setSubmitting(true);

    try {
      const updated = await ledgerApi.updateLedger(ledgerId, formData);
      setLedger(updated);
      closeEditModal();
    } catch (err: any) {
      console.error('Failed to update ledger:', err);
      alert(err.response?.data?.error?.message || '수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteLedger = async () => {
    setSubmitting(true);

    try {
      await ledgerApi.deleteLedger(ledgerId);
      navigate('/ledgers');
    } catch (err: any) {
      console.error('Failed to delete ledger:', err);
      alert(err.response?.data?.error?.message || '삭제에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const openTransactionModal = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setTransactionFormData({
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description || '',
        category: transaction.category || '',
        transactionDate: transaction.transactionDate,
        memo: transaction.memo || '',
      });
    } else {
      setEditingTransaction(null);
      setTransactionFormData({
        type: 'EXPENSE',
        amount: 0,
        description: '',
        category: '',
        transactionDate: new Date().toISOString().split('T')[0],
        memo: '',
      });
    }
    setShowTransactionModal(true);
  };

  const closeTransactionModal = () => {
    setShowTransactionModal(false);
    setEditingTransaction(null);
  };

  const saveTransaction = async () => {
    setTransactionSubmitting(true);

    try {
      const request: TransactionRequest = {
        ledgerId,
        type: transactionFormData.type,
        amount: transactionFormData.amount,
        description: transactionFormData.description || undefined,
        category: transactionFormData.category || undefined,
        transactionDate: transactionFormData.transactionDate,
        memo: transactionFormData.memo || undefined,
      };

      if (editingTransaction) {
        await transactionApi.updateTransaction(editingTransaction.id, request);
      } else {
        await transactionApi.createTransaction(request);
      }

      closeTransactionModal();
      await fetchTransactions();
    } catch (err: any) {
      console.error('Failed to save transaction:', err);
      alert(err.response?.data?.error?.message || '저장에 실패했습니다.');
    } finally {
      setTransactionSubmitting(false);
    }
  };

  const deleteTransaction = async () => {
    if (!editingTransaction) return;

    if (!confirm('정말로 이 거래를 삭제하시겠습니까?')) return;

    setTransactionSubmitting(true);

    try {
      await transactionApi.deleteTransaction(editingTransaction.id);
      closeTransactionModal();
      await fetchTransactions();
    } catch (err: any) {
      console.error('Failed to delete transaction:', err);
      alert(err.response?.data?.error?.message || '삭제에 실패했습니다.');
    } finally {
      setTransactionSubmitting(false);
    }
  };

  const changePeriodType = async (type: 'DAILY' | 'MONTHLY' | 'YEARLY') => {
    setSelectedPeriodType(type);
    setSelectedDate(new Date());
  };

  const navigatePeriod = (direction: number) => {
    const date = new Date(selectedDate);
    switch (selectedPeriodType) {
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
    setSelectedDate(date);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setInviteError('이메일을 입력해주세요.');
      return;
    }
    setInviteLoading(true);
    setInviteError('');
    try {
      const res = await ledgerApi.createInvitation(ledgerId, { inviteeEmail: inviteEmail, role: inviteRole });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('MEMBER');
      alert('초대가 발송되었습니다.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '초대에 실패했습니다.';
      setInviteError(msg);
    } finally {
      setInviteLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
    fetchCategories();
  }, [ledgerId]);

  useEffect(() => {
    if (ledger) {
      fetchTransactions();
    }
  }, [selectedPeriodType, selectedDate]);

  if (loading) {
    return (
      <div className={styles['loading-container']}>
        <div className={styles['loading-spinner']}></div>
        <p>가계부 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles['error-container']} glass`}>
        <h2>오류가 발생했습니다</h2>
        <p>{error}</p>
        <div className={styles['error-actions']}>
          <button onClick={fetchLedger} className={styles['btn-primary']}>
            다시 시도
          </button>
          <Link to="/ledgers" className={styles['btn-secondary']}>
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  if (!ledger) {
    return null;
  }

  return (
    <div className={styles['ledger-detail']}>
      <div className={styles['detail-content']}>
        {/* Header - LinkedCards 스타일 */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {ledger.name}
                {ledger.isDefault && (
                  <span className={styles['default-badge']}>기본</span>
                )}
              </h1>
              {ledger.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>{ledger.description}</p>
              )}
            </div>
          </div>

          {/* 액션 바 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link
              to="/ledgers"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.2rem',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'background 0.2s',
                textDecoration: 'none',
              }}
            >
              &#8592; 목록으로
            </Link>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setShowInviteModal(true)} className={styles['btn-primary']} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>멤버 초대</button>
              <Link to="categories" className={styles['btn-secondary']}>카테고리 관리</Link>
              <button onClick={openEditModal} className={styles['btn-secondary']}>수정</button>
              <button onClick={() => setShowDeleteModal(true)} className={styles['btn-danger']}>삭제</button>
            </div>
          </div>
        </div>

        {/* Transactions Section */}
        <div className={`${styles['transactions-section']} glass`}>
          <div className={styles['section-header']}>
            <h2>거래 내역</h2>
            <div className={styles['section-header-actions']}>
              <a
                href={`/transactions/cards?ledgerId=${ledgerId}`}
                className={styles['btn-secondary']}
                style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
              >
                &#128179; 카드 연동
              </a>
              <button
                className={styles['btn-primary']}
                onClick={() => openTransactionModal()}
              >
                + 거래 추가
              </button>
            </div>
          </div>

          {/* Period Selector */}
          <div className={styles['period-selector']}>
            <div className={styles['period-type-buttons']}>
              {periodTypes.map((type) => (
                <button
                  key={type.value}
                  className={`${styles['period-type-btn']} ${
                    selectedPeriodType === type.value ? styles.active : ''
                  }`}
                  onClick={() => changePeriodType(type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <div className={styles['period-navigator']}>
              <button
                className={styles['nav-btn']}
                onClick={() => navigatePeriod(-1)}
              >
                ←
              </button>
              <span className={styles['current-period']}>{currentPeriodLabel}</span>
              <button
                className={styles['nav-btn']}
                onClick={() => navigatePeriod(1)}
                disabled={isCurrentPeriod}
              >
                →
              </button>
            </div>

            {/* Period Stats */}
            <div className={styles['period-stats']}>
              <div className={`${styles['period-stat']} ${styles.income}`}>
                <span className={styles['period-stat-label']}>수입</span>
                <span className={styles['period-stat-value']}>
                  {formatCurrency(transactionSummary?.totalIncome || 0, ledger.currency)}
                </span>
              </div>
              <div className={`${styles['period-stat']} ${styles.expense}`}>
                <span className={styles['period-stat-label']}>지출</span>
                <span className={styles['period-stat-value']}>
                  {formatCurrency(transactionSummary?.totalExpense || 0, ledger.currency)}
                </span>
              </div>
              <div className={`${styles['period-stat']} ${styles.balance}`}>
                <span className={styles['period-stat-label']}>잔액</span>
                <span
                  className={`${styles['period-stat-value']} ${
                    (transactionSummary?.balance || 0) >= 0
                      ? styles.positive
                      : styles.negative
                  }`}
                >
                  {formatCurrency(transactionSummary?.balance || 0, ledger.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          {transactionsLoading ? (
            <div className={styles['transactions-loading']}>
              <div className={`${styles['loading-spinner']} ${styles.small}`}></div>
              <p>거래 내역을 불러오는 중...</p>
            </div>
          ) : transactions.length > 0 ? (
            <div className={styles['transactions-list']}>
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={styles['transaction-item']}
                  onClick={() => openTransactionModal(transaction)}
                >
                  <div className={styles['transaction-main']}>
                    <div
                      className={`${styles['transaction-type']} ${
                        styles[transaction.type.toLowerCase()]
                      }`}
                    >
                      {transaction.type === 'INCOME' ? '+' : '-'}
                    </div>
                    <div className={styles['transaction-info']}>
                      <span className={styles['transaction-description']}>
                        {transaction.description ||
                          (transaction.type === 'INCOME' ? '수입' : '지출')}
                      </span>
                      <span className={styles['transaction-meta']}>
                        {transaction.category || '미분류'} ·{' '}
                        {formatSimpleDate(transaction.transactionDate)}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`${styles['transaction-amount']} ${
                      styles[transaction.type.toLowerCase()]
                    }`}
                  >
                    {transaction.type === 'INCOME' ? '+' : '-'}
                    {formatCurrency(transaction.amount, ledger.currency)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles['no-transactions']}>
              <p>아직 거래 내역이 없습니다.</p>
              <p className={styles.hint}>
                위의 '거래 추가' 버튼을 클릭하여 첫 거래를 기록해보세요.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div
          className={styles['modal-overlay']}
        >
          <div className={`${styles.modal} glass`}>
            <h2>가계부 수정</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateLedger();
              }}
            >
              <div className={styles['form-group']}>
                <label htmlFor="edit-name">이름 *</label>
                <input
                  id="edit-name"
                  type="text"
                  placeholder="가계부 이름을 입력하세요"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className={styles['form-group']}>
                <label htmlFor="edit-description">설명</label>
                <textarea
                  id="edit-description"
                  placeholder="가계부 설명을 입력하세요"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                ></textarea>
              </div>
              <div className={styles['form-group']}>
                <label htmlFor="edit-currency">통화</label>
                <select
                  id="edit-currency"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                >
                  <option value="KRW">KRW (원)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
              <div className={`${styles['form-group']} ${styles.checkbox}`}>
                <input
                  id="edit-isDefault"
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData({ ...formData, isDefault: e.target.checked })
                  }
                />
                <label htmlFor="edit-isDefault">기본 가계부로 설정</label>
              </div>
              <div className={styles['modal-actions']}>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className={styles['btn-secondary']}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={styles['btn-primary']}
                  disabled={submitting}
                >
                  {submitting ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div
          className={styles['modal-overlay']}
        >
          <div className={`${styles.modal} glass`}>
            <h2>가계부 삭제</h2>
            <p>정말로 "{ledger?.name}" 가계부를 삭제하시겠습니까?</p>
            <p className={styles.warning}>
              이 작업은 되돌릴 수 없으며, 모든 거래 내역도 함께 삭제됩니다.
            </p>
            <div className={styles['modal-actions']}>
              <button
                onClick={() => setShowDeleteModal(false)}
                className={styles['btn-secondary']}
              >
                취소
              </button>
              <button
                onClick={deleteLedger}
                className={styles['btn-danger']}
                disabled={submitting}
              >
                {submitting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div
          className={styles['modal-overlay']}
        >
          <div className={`${styles.modal} glass`}>
            <h2>{editingTransaction ? '거래 수정' : '거래 추가'}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveTransaction();
              }}
            >
              <div className={styles['form-group']}>
                <label>거래 유형 *</label>
                <div className={styles['type-selector']}>
                  <button
                    type="button"
                    className={`${styles['type-btn']} ${styles.income} ${
                      transactionFormData.type === 'INCOME' ? styles.active : ''
                    }`}
                    onClick={() =>
                      setTransactionFormData({
                        ...transactionFormData,
                        type: 'INCOME',
                      })
                    }
                  >
                    수입
                  </button>
                  <button
                    type="button"
                    className={`${styles['type-btn']} ${styles.expense} ${
                      transactionFormData.type === 'EXPENSE' ? styles.active : ''
                    }`}
                    onClick={() =>
                      setTransactionFormData({
                        ...transactionFormData,
                        type: 'EXPENSE',
                      })
                    }
                  >
                    지출
                  </button>
                </div>
              </div>
              <div className={styles['form-group']}>
                <label htmlFor="tx-amount">금액 *</label>
                <input
                  id="tx-amount"
                  type="number"
                  placeholder="금액을 입력하세요"
                  min="1"
                  step="1"
                  required
                  value={transactionFormData.amount || ''}
                  onChange={(e) =>
                    setTransactionFormData({
                      ...transactionFormData,
                      amount: e.target.value === '' ? 0 : parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div className={styles['form-group']}>
                <label htmlFor="tx-date">날짜 *</label>
                <input
                  id="tx-date"
                  type="date"
                  required
                  value={transactionFormData.transactionDate}
                  onChange={(e) =>
                    setTransactionFormData({
                      ...transactionFormData,
                      transactionDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className={styles['form-group']}>
                <label htmlFor="tx-description">설명</label>
                <input
                  id="tx-description"
                  type="text"
                  placeholder="거래 설명을 입력하세요"
                  value={transactionFormData.description}
                  onChange={(e) =>
                    setTransactionFormData({
                      ...transactionFormData,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className={styles['form-group']}>
                <label htmlFor="tx-category">카테고리</label>
                <select
                  id="tx-category"
                  value={transactionFormData.category}
                  onChange={(e) =>
                    setTransactionFormData({
                      ...transactionFormData,
                      category: e.target.value,
                    })
                  }
                >
                  <option value="">선택하세요</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.categoryId} value={cat.name}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles['form-group']}>
                <label htmlFor="tx-memo">메모</label>
                <textarea
                  id="tx-memo"
                  placeholder="메모를 입력하세요"
                  rows={2}
                  value={transactionFormData.memo}
                  onChange={(e) =>
                    setTransactionFormData({
                      ...transactionFormData,
                      memo: e.target.value,
                    })
                  }
                ></textarea>
              </div>
              <div className={styles['modal-actions']}>
                {editingTransaction && (
                  <button
                    type="button"
                    onClick={deleteTransaction}
                    className={styles['btn-danger']}
                    disabled={transactionSubmitting}
                  >
                    삭제
                  </button>
                )}
                <div className={styles.spacer}></div>
                <button
                  type="button"
                  onClick={closeTransactionModal}
                  className={styles['btn-secondary']}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={styles['btn-primary']}
                  disabled={transactionSubmitting}
                >
                  {transactionSubmitting ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 멤버 초대 모달 */}
      {showInviteModal && (
        <div className={styles['modal-overlay']}>
          <div className={`${styles.modal} glass`}>
            <h2>멤버 초대</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              이메일 주소로 가계부 멤버를 초대합니다.
            </p>

            {inviteError && (
              <div style={{
                padding: '0.75rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-md)',
                color: '#ef4444',
                fontSize: '0.875rem',
                marginBottom: '1rem',
              }}>
                {inviteError}
              </div>
            )}

            <div className={styles['form-group']}>
              <label>이메일 *</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="초대할 멤버의 이메일"
                className={styles['form-input']}
              />
            </div>

            <div className={styles['form-group']}>
              <label>역할</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className={styles['form-input']}
              >
                <option value="MEMBER">멤버 (거래 기록 가능)</option>
                <option value="ADMIN">관리자 (카테고리/카드 관리)</option>
                <option value="VIEWER">조회자 (조회만 가능)</option>
              </select>
            </div>

            <div className={styles['modal-actions']}>
              <button
                className={styles['btn-secondary']}
                onClick={() => { setShowInviteModal(false); setInviteEmail(''); setInviteError(''); }}
              >
                취소
              </button>
              <button
                className={styles['btn-primary']}
                onClick={handleInvite}
                disabled={inviteLoading}
              >
                {inviteLoading ? '초대 중...' : '초대 보내기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
