import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/composables/useAuth';
import ledgerApi from '@/api/ledgerApi';
import type { LedgerSummary, Ledger, LedgerRequest } from '@/types/ledger.types';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingLedger, setEditingLedger] = useState<Ledger | null>(null);
  const [ledgerToDelete, setLedgerToDelete] = useState<Ledger | null>(null);

  // Form data
  const [formData, setFormData] = useState<LedgerRequest>({
    name: '',
    description: '',
    currency: 'KRW',
    isDefault: false,
  });

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await ledgerApi.getSummary();
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to fetch summary:', err);
      if (err.response?.status === 401) {
        setError('로그인이 필요합니다.');
      } else {
        setError(
          err.response?.data?.error?.message || '가계부 정보를 불러오는데 실패했습니다.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount || 0);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      currency: 'KRW',
      isDefault: false,
    });
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingLedger(null);
    resetForm();
  };

  const openEditModal = (ledger: Ledger) => {
    setEditingLedger(ledger);
    setFormData({
      name: ledger.name,
      description: ledger.description || '',
      currency: ledger.currency,
      isDefault: ledger.isDefault,
    });
    setShowEditModal(true);
  };

  const confirmDelete = (ledger: Ledger) => {
    setLedgerToDelete(ledger);
    setShowDeleteModal(true);
  };

  const submitForm = async () => {
    setSubmitting(true);

    try {
      if (showEditModal && editingLedger) {
        await ledgerApi.updateLedger(editingLedger.ledgerId, formData);
      } else {
        await ledgerApi.createLedger(formData);
      }
      closeModal();
      await fetchSummary();
    } catch (err: any) {
      console.error('Failed to submit:', err);
      alert(err.response?.data?.error?.message || '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteLedger = async () => {
    if (!ledgerToDelete) return;

    setSubmitting(true);

    try {
      await ledgerApi.deleteLedger(ledgerToDelete.ledgerId);
      setShowDeleteModal(false);
      setLedgerToDelete(null);
      await fetchSummary();
    } catch (err: any) {
      console.error('Failed to delete:', err);
      alert(err.response?.data?.error?.message || '삭제에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const goToLedger = (ledgerId: number) => {
    navigate(`ledger/${ledgerId}`);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSummary();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className={styles['loading-container']}>
        <div className={styles['loading-spinner']}></div>
        <p>가계부 현황을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles['error-container']} glass`}>
        <h2>오류가 발생했습니다</h2>
        <p>{error}</p>
        <button onClick={fetchSummary} className={styles['btn-primary']}>
          다시 시도
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`${styles['auth-required']} glass`}>
        <h2>로그인이 필요합니다</h2>
        <p>가계부를 확인하려면 먼저 로그인해주세요.</p>
        <button
          className={styles['btn-primary']}
          onClick={() => login(window.location.href)}
          style={{ marginTop: '1.5rem' }}
        >
          로그인하러 가기
        </button>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className={styles.dashboard}>
      {/* Dashboard Content */}
      <div className={styles['dashboard-content']}>
        {/* Header */}
        <div className={styles['dashboard-header']}>
          <h1>
            안녕하세요, <span className={styles['gradient-text']}>{summary.username}</span>님!
          </h1>
          <p className={styles.subtitle}>가계부 현황을 확인하세요</p>
        </div>

        {/* Summary Cards */}
        <div className={styles['summary-cards']}>
          <div className={`${styles['summary-card']} glass`}>
            <div className={`${styles['card-icon']} ${styles.count}`}>
              <span>#</span>
            </div>
            <div className={styles['card-content']}>
              <p className={styles['card-label']}>가계부 수</p>
              <p className={styles['card-value']}>{summary.totalLedgerCount}개</p>
            </div>
          </div>
        </div>

        {/* Ledger Section */}
        <div className={styles['ledger-section']}>
          <div className={styles['section-header']}>
            <h2>내 가계부</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className={styles['btn-primary']}
            >
              + 새 가계부
            </button>
          </div>

          {summary.ledgers.length === 0 ? (
            <div className={`${styles['empty-state']} glass`}>
              <p>아직 가계부가 없습니다.</p>
              <p>새 가계부를 만들어 수입과 지출을 관리해보세요!</p>
            </div>
          ) : (
            <div className={styles['ledger-grid']}>
              {summary.ledgers.map((ledger) => (
                <div
                  key={ledger.ledgerId}
                  className={`${styles['ledger-card']} glass ${
                    ledger.isDefault ? styles['is-default'] : ''
                  }`}
                  onClick={() => goToLedger(ledger.ledgerId)}
                >
                  <div className={styles['ledger-header']}>
                    <h3>{ledger.name}</h3>
                    {ledger.isDefault && (
                      <span className={styles['default-badge']}>기본</span>
                    )}
                  </div>
                  <p className={styles['ledger-description']}>
                    {ledger.description || '설명 없음'}
                  </p>

                  <div className={styles['ledger-footer']}>
                    <span className={styles['currency-badge']}>{ledger.currency}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div
          className={styles['modal-overlay']}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className={styles.modal}>
            <h2>{showEditModal ? '가계부 수정' : '새 가계부 만들기'}</h2>
            <form onSubmit={(e) => { e.preventDefault(); submitForm(); }}>
              <div className={styles['form-group']}>
                <label htmlFor="name">이름 *</label>
                <input
                  id="name"
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
                <label htmlFor="description">설명</label>
                <textarea
                  id="description"
                  placeholder="가계부 설명을 입력하세요"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                ></textarea>
              </div>
              <div className={styles['form-group']}>
                <label htmlFor="currency">통화</label>
                <select
                  id="currency"
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
                  id="isDefault"
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData({ ...formData, isDefault: e.target.checked })
                  }
                />
                <label htmlFor="isDefault">기본 가계부로 설정</label>
              </div>
              <div className={styles['modal-actions']}>
                <button
                  type="button"
                  onClick={closeModal}
                  className={styles['btn-secondary']}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={styles['btn-primary']}
                  disabled={submitting}
                >
                  {submitting ? '처리 중...' : showEditModal ? '수정' : '만들기'}
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
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteModal(false);
          }}
        >
          <div className={styles.modal}>
            <h2>가계부 삭제</h2>
            <p>정말로 "{ledgerToDelete?.name}" 가계부를 삭제하시겠습니까?</p>
            <p className={styles.warning}>이 작업은 되돌릴 수 없습니다.</p>
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
    </div>
  );
}
