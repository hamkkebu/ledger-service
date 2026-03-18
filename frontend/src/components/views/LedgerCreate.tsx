import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/composables/useAuth';
import ledgerApi from '@/api/ledgerApi';
import type { LedgerRequest } from '@/types/ledger.types';
import styles from './LedgerCreate.module.css';

interface Currency {
  code: string;
  symbol: string;
  name: string;
}

const currencies: Currency[] = [
  { code: 'KRW', symbol: '₩', name: '한국 원' },
  { code: 'USD', symbol: '$', name: '미국 달러' },
  { code: 'EUR', symbol: '€', name: '유로' },
  { code: 'JPY', symbol: '¥', name: '일본 엔' },
];

export default function LedgerCreate() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<LedgerRequest>({
    name: '',
    description: '',
    currency: 'KRW',
    isDefault: true,
  });

  const createLedger = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('가계부 이름을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const ledger = await ledgerApi.createLedger(formData);
      navigate(`ledger/${ledger.ledgerId}`);
    } catch (err: any) {
      console.error('Failed to create ledger:', err);
      if (err.response?.status === 401) {
        setError('로그인이 필요합니다. Auth Service에서 로그인 후 다시 시도해주세요.');
      } else {
        setError(
          err.response?.data?.error?.message || '가계부 생성에 실패했습니다.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles['ledger-create']}>
      <div className={styles['create-container']}>
        {/* Header */}
        <div className={styles['create-header']}>
          <Link to=".." className={styles['back-link']}>
            <span className={styles['back-icon']}>←</span>
            홈으로
          </Link>
          <h1>새 가계부 만들기</h1>
          <p className={styles.subtitle}>
            나만의 가계부를 만들어 수입과 지출을 체계적으로 관리하세요
          </p>
        </div>

        {/* Auth Required */}
        {!isAuthenticated ? (
          <div className={`${styles['auth-required']} glass`}>
            <div className={styles['auth-icon']}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h2>로그인이 필요합니다</h2>
            <p>가계부를 만들려면 먼저 로그인해주세요.</p>
            <button
              className={styles['btn-primary']}
              onClick={() => login(window.location.href)}
              style={{ marginTop: '1.5rem' }}
            >
              로그인하러 가기
            </button>
          </div>
        ) : (
          <>
            {/* Create Form */}
            <div className={`${styles['create-form']} glass`}>
              <form onSubmit={createLedger}>
                {/* Name */}
                <div className={styles['form-group']}>
                  <label htmlFor="name">
                    <span className={styles['label-icon']}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                      </svg>
                    </span>
                    가계부 이름 <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="예: 생활비, 여행 경비, 프로젝트 예산"
                    required
                    maxLength={100}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                  <span className={styles['char-count']}>
                    {formData.name.length}/100
                  </span>
                </div>

                {/* Description */}
                <div className={styles['form-group']}>
                  <label htmlFor="description">
                    <span className={styles['label-icon']}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
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
                    placeholder="이 가계부에 대한 설명을 입력하세요 (선택사항)"
                    rows={3}
                    maxLength={500}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  ></textarea>
                  <span className={styles['char-count']}>
                    {formData.description.length}/500
                  </span>
                </div>

                {/* Currency */}
                <div className={styles['form-group']}>
                  <label htmlFor="currency">
                    <span className={styles['label-icon']}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                      </svg>
                    </span>
                    통화
                  </label>
                  <div className={styles['currency-options']}>
                    {currencies.map((currency) => (
                      <label
                        key={currency.code}
                        className={`${styles['currency-option']} ${
                          formData.currency === currency.code
                            ? styles.selected
                            : ''
                        }`}
                      >
                        <input
                          type="radio"
                          value={currency.code}
                          checked={formData.currency === currency.code}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              currency: e.target.value,
                            })
                          }
                        />
                        <span className={styles['currency-symbol']}>
                          {currency.symbol}
                        </span>
                        <span className={styles['currency-name']}>
                          {currency.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Default Ledger */}
                <div className={`${styles['form-group']} ${styles['checkbox-group']}`}>
                  <label className={styles['checkbox-label']}>
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isDefault: e.target.checked,
                        })
                      }
                    />
                    <span className={styles['checkbox-custom']}></span>
                    <span className={styles['checkbox-text']}>
                      <strong>기본 가계부로 설정</strong>
                      <small>앱 실행 시 이 가계부가 먼저 표시됩니다</small>
                    </span>
                  </label>
                </div>

                {/* Error Message */}
                {error && (
                  <div className={styles['error-message']}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className={styles['form-actions']}>
                  <Link to=".." className={styles['btn-secondary']}>
                    취소
                  </Link>
                  <button
                    type="submit"
                    className={styles['btn-primary']}
                    disabled={submitting || !formData.name}
                  >
                    {submitting && <span className={styles.spinner}></span>}
                    {submitting ? '생성 중...' : '가계부 만들기'}
                  </button>
                </div>
              </form>
            </div>

            {/* Info Cards */}
            <div className={styles['info-cards']}>
              <div className={`${styles['info-card']} glass`}>
                <div className={`${styles['info-icon']} ${styles.income}`}>+</div>
                <h3>수입 관리</h3>
                <p>급여, 부수입 등 모든 수입을 기록하세요</p>
              </div>
              <div className={`${styles['info-card']} glass`}>
                <div className={`${styles['info-icon']} ${styles.expense}`}>-</div>
                <h3>지출 관리</h3>
                <p>식비, 교통비 등 지출을 카테고리별로 관리하세요</p>
              </div>
              <div className={`${styles['info-card']} glass`}>
                <div className={`${styles['info-icon']} ${styles.balance}`}>=</div>
                <h3>잔액 확인</h3>
                <p>한눈에 보는 재정 현황으로 계획을 세우세요</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
