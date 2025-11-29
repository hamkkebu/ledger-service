/**
 * 애플리케이션 상수 정의 - Ledger Service
 */

/**
 * API 엔드포인트
 */
export const API_ENDPOINTS = {
  // Ledger 관련
  LEDGERS: '/api/v1/ledgers',
  LEDGER_BY_ID: (id: number) => `/api/v1/ledgers/${id}`,
  LEDGER_SUMMARY: '/api/v1/ledgers/summary',
} as const;

/**
 * 라우트 경로
 */
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  LEDGER_CREATE: '/create',
  LEDGER_DETAIL: (id: number) => `/ledger/${id}`,
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
  BAD_REQUEST: '잘못된 요청입니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
  VALIDATION_ERROR: '입력값을 확인해주세요.',
} as const;

/**
 * 성공 메시지
 */
export const SUCCESS_MESSAGES = {
  CREATE_SUCCESS: '가계부가 생성되었습니다.',
  UPDATE_SUCCESS: '정보가 성공적으로 수정되었습니다.',
  DELETE_SUCCESS: '삭제가 완료되었습니다.',
  SAVE_SUCCESS: '저장되었습니다.',
} as const;
