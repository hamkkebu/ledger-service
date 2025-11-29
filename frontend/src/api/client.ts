import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types/api.types';

/**
 * 토큰 제공자 (Keycloak에서 토큰 가져오기)
 * useAuth에서 설정됨
 */
let tokenProvider: (() => Promise<string | null>) | null = null;

/**
 * 토큰 제공자 설정 함수
 */
export function setTokenProvider(provider: () => Promise<string | null>): void {
  tokenProvider = provider;
}

/**
 * Axios 인스턴스 생성
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.VUE_APP_baseApiURL || '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 요청 인터셉터
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    let token: string | null = null;

    if (tokenProvider) {
      token = await tokenProvider();
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 요청 로깅 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * 응답 인터셉터
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<any>>) => {
    // 응답 로깅 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.config.url}`, response.data);
    }

    return response;
  },
  async (error: AxiosError<ApiResponse<any>>) => {
    // 401 에러 처리: Keycloak 세션 만료
    if (error.response?.status === 401) {
      console.log('[Keycloak] Session expired, redirecting to home...');
      handleTokenExpired();
      return Promise.reject(error);
    }

    // 401 이외의 에러 처리
    if (error.response) {
      const { status, data } = error.response;

      // API 응답 에러
      if (data?.error) {
        let errorMessage = data.error.message || '오류가 발생했습니다.';

        // 검증 에러(COMMON-009)인 경우 상세 에러 메시지 추출
        if (data.error.code === 'COMMON-009' && data.error.details) {
          const details = data.error.details;
          if (typeof details === 'object' && details !== null) {
            const errorMessages = Object.entries(details)
              .map(([field, message]) => `${message}`)
              .join('\n');
            if (errorMessages) {
              errorMessage = errorMessages;
            }
          }
        }

        console.error(`[API Error ${status}]`, errorMessage);
        alert(errorMessage);
      } else {
        handleHttpError(status);
      }
    } else if (error.request) {
      // 요청은 보냈지만 응답을 받지 못함
      console.error('[Network Error]', error.message);
      alert('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
    } else {
      // 요청 설정 중 오류 발생
      console.error('[Request Setup Error]', error.message);
      alert('요청 처리 중 오류가 발생했습니다.');
    }

    return Promise.reject(error);
  }
);

/**
 * 토큰 만료 처리 (Home으로 리다이렉트)
 */
function handleTokenExpired(): void {
  alert('세션이 만료되었습니다. 다시 로그인해주세요.');
  window.location.href = '/';
}

/**
 * HTTP 상태 코드별 에러 처리
 */
function handleHttpError(status: number): void {
  switch (status) {
    case 400:
      alert('잘못된 요청입니다.');
      break;
    case 403:
      alert('접근 권한이 없습니다.');
      break;
    case 404:
      alert('요청한 리소스를 찾을 수 없습니다.');
      break;
    case 500:
      alert('서버 오류가 발생했습니다.');
      break;
    case 503:
      alert('서비스를 일시적으로 사용할 수 없습니다.');
      break;
    default:
      alert(`오류가 발생했습니다. (${status})`);
  }
}

export default apiClient;
