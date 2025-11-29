import { ref, computed } from 'vue';
import axios from 'axios';
import { API_ENDPOINTS, STORAGE_KEYS } from '@/constants';

interface User {
  userId: number;
  username: string;
  email: string;
  role: string;
}

/**
 * 인증 상태 관리 Composable
 */
const currentUser = ref<User | null>(null);
const authToken = ref<string | null>(null);
const isAuthenticated = computed(() => !!authToken.value);

/**
 * Auth Service API URL (로그아웃 등 인증 관련 API 호출용)
 */
const AUTH_API_URL = process.env.VUE_APP_AUTH_API_URL || 'http://localhost:8081';

export function useAuth() {
  /**
   * 인증 정보 설정 (로그인 시)
   */
  const setAuth = (token: string, user: User, refreshToken?: string) => {
    authToken.value = token;
    currentUser.value = user;
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  };

  /**
   * 로그아웃
   */
  const logout = async () => {
    try {
      // 백엔드에 로그아웃 요청하여 토큰 무효화
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

      await axios.post(`${AUTH_API_URL}${API_ENDPOINTS.AUTH.LOGOUT}`, null, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Refresh-Token': refreshToken || '',
        },
      });
    } catch (error) {
      console.error('Logout API error:', error);
      // API 호출 실패해도 로컬 데이터는 삭제
    } finally {
      // 로컬 스토리지 정리
      clearAuth();
    }
  };

  /**
   * 인증 정보 초기화 (로컬만)
   */
  const clearAuth = () => {
    authToken.value = null;
    currentUser.value = null;
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  };

  /**
   * 저장된 인증 정보 복원
   */
  const restoreAuth = () => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const userStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);

    if (token && userStr) {
      try {
        authToken.value = token;
        currentUser.value = JSON.parse(userStr);
      } catch (error) {
        console.error('Failed to restore auth:', error);
        clearAuth();
      }
    }
  };

  /**
   * 인증 토큰 가져오기
   */
  const getToken = (): string | null => {
    return authToken.value || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  };

  return {
    currentUser,
    authToken,
    isAuthenticated,
    setAuth,
    logout,
    clearAuth,
    restoreAuth,
    getToken,
  };
}
