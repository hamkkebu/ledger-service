/**
 * 애플리케이션 상수 정의
 */

/**
 * API 엔드포인트
 */
export const API_ENDPOINTS = {
  // Ledger 관련
  LEDGERS: '/api/v1/ledgers',
  LEDGER_BY_ID: (id: number) => `/api/v1/ledgers/${id}`,
  LEDGER_SUMMARY: (id: number) => `/api/v1/ledgers/${id}/summary`,

  // Transaction 관련
  TRANSACTIONS: '/api/v1/transactions',
  TRANSACTION_BY_ID: (id: number) => `/api/v1/transactions/${id}`,

  // 인증 관련 (auth-service)
  AUTH: {
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh',
    VALIDATE: '/api/v1/auth/validate',
  },
} as const;

/**
 * 라우트 경로
 */
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  LEDGER_CREATE: '/create',
  LEDGER_DETAIL: (id: number) => `/ledger/${id}`,
  LOGIN: '/login',
} as const;

/**
 * 에러 메시지
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
  SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  UNAUTHORIZED: '인증이 필요합니다. 다시 로그인해주세요.',
  FORBIDDEN: '접근 권한이 없습니다.',
  NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',
} as const;

/**
 * 로컬 스토리지 키
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  CURRENT_USER: 'currentUser',
} as const;
