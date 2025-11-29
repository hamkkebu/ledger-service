import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

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
 * 인증이 필요 없는 API 엔드포인트 목록
 */
const PUBLIC_ENDPOINTS = [
  '/api/v1/ledgers/public',
];

/**
 * 요청 인터셉터
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 인증이 필요 없는 엔드포인트인지 확인
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint =>
      config.url?.includes(endpoint)
    );

    // 인증이 필요한 API에만 토큰 추가
    if (!isPublicEndpoint) {
      const token = localStorage.getItem('authToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
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
  (response: AxiosResponse) => {
    // 응답 로깅 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.config.url}`, response.data);
    }

    return response;
  },
  async (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;

      switch (status) {
        case 401:
          console.error('[Unauthorized]');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          break;
        case 403:
          console.error('[Forbidden]');
          alert('접근 권한이 없습니다.');
          break;
        case 404:
          console.error('[Not Found]');
          break;
        case 500:
          console.error('[Server Error]');
          alert('서버 오류가 발생했습니다.');
          break;
        default:
          console.error(`[Error ${status}]`);
      }
    } else if (error.request) {
      console.error('[Network Error]', error.message);
      alert('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
