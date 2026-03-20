import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ledgerApi from '@/api/ledgerApi';
import transactionApi from '@/api/transactionApi';
import { categoryApi } from '@/api/categoryApi';
import { useAuth } from '@/composables/useAuth';
import type { Ledger, LedgerRequest, LedgerMember } from '@/types/ledger.types';
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
  const { getToken, currentUser } = useAuth();

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
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);
  const [sentInvitationsLoading, setSentInvitationsLoading] = useState(false);
  const [members, setMembers] = useState<LedgerMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

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
      setInviteEmail('');
      setInviteRole('MEMBER');
      await fetchSentInvitations();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '초대에 실패했습니다.';
      setInviteError(msg);
    } finally {
      setInviteLoading(false);
    }
  };

  const fetchSentInvitations = async () => {
    setSentInvitationsLoading(true);
    try {
      const data = await ledgerApi.getSentInvitations(ledgerId);
      setSentInvitations(data || []);
    } catch (err) {
      console.error('Failed to fetch sent invitations:', err);
    } finally {
      setSentInvitationsLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    try {
      await ledgerApi.cancelInvitation(invitationId);
      setSentInvitations((prev) => prev.filter((inv) => inv.invitationId !== invitationId));
    } catch (err: any) {
      console.error('Failed to cancel invitation:', err);
    }
  };

  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      const data = await ledgerApi.getMembers(ledgerId);
      setMembers(data || []);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleRemoveMember = async (member: LedgerMember) => {
    if (!confirm(`정말로 ${member.username || member.email || '이 멤버'}를 제거하시겠습니까?`)) return;
    try {
      await ledgerApi.removeMember(ledgerId, member.ledgerMemberId);
      setMembers((prev) => prev.filter((m) => m.ledgerMemberId !== member.ledgerMemberId));
    } catch (err: any) {
      console.error('Failed to remove member:', err);
      alert(err.response?.data?.error?.message || '멤버 제거에 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchLedger();
    fetchCategories();
    fetchMembers();
  }, [ledgerId]);

  useEffect(() => {
    if (ledger) {
      fetchTransactions();
    }
  }, [selectedPeriodType, selectedDate]);

  // 현재 유저의 역할 계산
  const myRole = (() => {
    if (!currentUser || !members.length) return null;
    const me = members.find((m) => m.username === currentUser.username);
    return me?.role || null;
  })();
  const isOwner = myRole === 'OWNER';
  const isAdmin = myRole === 'ADMIN';
  const isAdminOrOwner = isOwner || isAdmin;
  const canWrite = isOwner || isAdmin || myRole === 'MEMBER'; // VIEWER 제외

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
              {isAdminOrOwner && <button onClick={() => { setShowInviteModal(true); fetchSentInvitations(); fetchMembers(); }} className={styles['btn-primary']} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>멤버 관리</button>}
              {isAdminOrOwner && <Link to="categories" className={styles['btn-secondary']}>카테고리 관리</Link>}
              {isAdminOrOwner && <button onClick={openEditModal} className={styles['btn-secondary']}>수정</button>}
              {isOwner && <button onClick={() => setShowDeleteModal(true)} className={styles['btn-danger']}>삭제</button>}
            </div>
          </div>
        </div>

        {/* Transactions Section */}
        <div className={`${styles['transactions-section']} glass`}>
          <div className={styles['section-header']}>
            <h2>거래 내역</h2>
            {canWrite && (
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
            )}
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
                  onClick={() => canWrite && openTransactionModal(transaction)}
                  style={{ cursor: canWrite ? 'pointer' : 'default' }}
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
            {/* 헤더 */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✉️</div>
              <h2 style={{ margin: '0 0 0.5rem 0' }}>멤버 초대</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                함께 가계부를 관리할 멤버를 초대하세요
              </p>
            </div>

            {inviteError && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '12px',
                color: '#dc2626',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <span>⚠️</span> {inviteError}
              </div>
            )}

            {/* 이메일 입력 */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
              }}>
                이메일 주소
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: 'var(--bg-primary)',
                border: '1.5px solid var(--border-subtle)',
                borderRadius: '12px',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}>
                <span style={{ fontSize: '1.1rem', opacity: 0.5 }}>📧</span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="example@email.com"
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontFamily: 'var(--font-family)',
                  }}
                />
              </div>
            </div>

            {/* 역할 선택 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
              }}>
                역할 선택
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { value: 'MEMBER', label: '멤버', desc: '거래 기록 가능', icon: '👤' },
                  { value: 'ADMIN', label: '관리자', desc: '카테고리/카드 관리', icon: '🛡️' },
                  { value: 'VIEWER', label: '조회자', desc: '조회만 가능', icon: '👁️' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    onClick={() => setInviteRole(opt.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      border: inviteRole === opt.value
                        ? '1.5px solid var(--accent-purple)'
                        : '1.5px solid var(--border-subtle)',
                      background: inviteRole === opt.value
                        ? 'rgba(124, 58, 237, 0.06)'
                        : 'var(--bg-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{opt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{opt.label}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{opt.desc}</div>
                    </div>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: inviteRole === opt.value
                        ? '5px solid var(--accent-purple)'
                        : '2px solid var(--border-subtle)',
                      transition: 'all 0.15s',
                    }} />
                  </label>
                ))}
              </div>
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button
                className={styles['btn-secondary']}
                onClick={() => { setShowInviteModal(false); setInviteEmail(''); setInviteError(''); }}
                style={{ flex: 1 }}
              >
                닫기
              </button>
              <button
                className={styles['btn-primary']}
                onClick={handleInvite}
                disabled={inviteLoading || !inviteEmail.trim()}
                style={{ flex: 1, opacity: inviteLoading || !inviteEmail.trim() ? 0.6 : 1 }}
              >
                {inviteLoading ? '초대 중...' : '초대 보내기'}
              </button>
            </div>

            {/* 현재 멤버 목록 */}
            {members.length > 0 && (
              <div>
                <div style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '1.25rem',
                  marginBottom: '1.25rem',
                }}>
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <span>👥</span> 현재 멤버 ({members.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {members.map((member) => (
                      <div
                        key={member.ledgerMemberId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '10px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {member.username || member.email || `사용자 ${member.accountId}`}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', marginTop: '2px' }}>
                            <span style={{
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: member.role === 'OWNER' ? 'rgba(124, 58, 237, 0.15)' : member.role === 'ADMIN' ? 'rgba(59, 130, 246, 0.15)' : member.role === 'VIEWER' ? 'rgba(107, 114, 128, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: member.role === 'OWNER' ? '#7c3aed' : member.role === 'ADMIN' ? '#2563eb' : member.role === 'VIEWER' ? '#4b5563' : '#059669',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                            }}>
                              {member.role === 'OWNER' ? '소유자' : member.role === 'ADMIN' ? '관리자' : member.role === 'VIEWER' ? '조회자' : '멤버'}
                            </span>
                            {member.email && <span>{member.email}</span>}
                          </div>
                        </div>
                        {member.role !== 'OWNER' && (
                          currentUser?.username === member.username ? (
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: 'rgba(107, 114, 128, 0.1)',
                              color: '#6b7280',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              flexShrink: 0,
                              marginLeft: '0.5rem',
                            }}>
                              본인
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRemoveMember(member)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'rgba(239, 68, 68, 0.08)',
                                color: '#dc2626',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                flexShrink: 0,
                                marginLeft: '0.5rem',
                              }}
                            >
                              제거
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 보낸 초대 목록 */}
            {sentInvitations.length > 0 && (
              <div>
                <div style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '1.25rem',
                }}>
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <span>📤</span> 보낸 초대 ({sentInvitations.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {sentInvitations.map((inv) => (
                      <div
                        key={inv.invitationId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '10px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {inv.inviteeEmail}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', marginTop: '2px' }}>
                            <span style={{
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: inv.status === 'PENDING' ? 'rgba(251, 191, 36, 0.15)' : inv.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: inv.status === 'PENDING' ? '#d97706' : inv.status === 'ACCEPTED' ? '#059669' : '#dc2626',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                            }}>
                              {inv.status === 'PENDING' ? '대기 중' : inv.status === 'ACCEPTED' ? '수락됨' : inv.status === 'REJECTED' ? '거절됨' : inv.status === 'EXPIRED' ? '만료됨' : inv.status}
                            </span>
                            <span>{inv.role === 'ADMIN' ? '관리자' : inv.role === 'VIEWER' ? '조회자' : '멤버'}</span>
                          </div>
                        </div>
                        {inv.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelInvitation(inv.invitationId)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              background: 'rgba(239, 68, 68, 0.08)',
                              color: '#dc2626',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              flexShrink: 0,
                              marginLeft: '0.5rem',
                            }}
                          >
                            취소
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
