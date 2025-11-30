import { ref, computed } from 'vue';
import { setTokenProvider } from '@/api/client';

/**
 * Keycloak 설정
 */
const keycloakConfig = {
  url: process.env.VUE_APP_KEYCLOAK_URL || 'http://localhost:8180',
  realm: process.env.VUE_APP_KEYCLOAK_REALM || 'hamkkebu',
  clientId: process.env.VUE_APP_KEYCLOAK_CLIENT_ID || 'hamkkebu-frontend',
};

/**
 * 인증 관련 사용자 정보 타입
 */
interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
}

/**
 * 인증 상태 (싱글톤)
 */
const currentUser = ref<AuthUser | null>(null);
const token = ref<string | null>(null);
const refreshToken = ref<string | null>(null);
const isAuthenticated = computed(() => currentUser.value !== null && token.value !== null);

/**
 * 인증 상태 관리 Composable
 *
 * Keycloak Admin API 기반 인증을 제공합니다.
 * - 로그인: Direct Access Grants (Resource Owner Password Credentials)
 * - SSO 기능 미사용
 */
export function useAuth() {
  /**
   * 인증 초기화
   * localStorage에서 토큰 복원
   */
  const initAuth = async (): Promise<boolean> => {
    // API 클라이언트에 토큰 제공자 설정
    setTokenProvider(() => Promise.resolve(token.value));

    // localStorage에서 토큰 복원
    const savedToken = localStorage.getItem('authToken');
    const savedRefreshToken = localStorage.getItem('refreshToken');
    const savedUser = localStorage.getItem('currentUser');

    if (savedToken && savedUser) {
      token.value = savedToken;
      refreshToken.value = savedRefreshToken;

      try {
        currentUser.value = JSON.parse(savedUser);

        // 토큰 유효성 검증 (만료 체크)
        if (isTokenExpired(savedToken)) {
          // 토큰 만료 시 갱신 시도
          const refreshed = await refreshTokens();
          if (!refreshed) {
            clearAuthState();
            return false;
          }
        }

        return true;
      } catch {
        clearAuthState();
        return false;
      }
    }

    return false;
  };

  /**
   * JWT 토큰 만료 여부 확인
   */
  const isTokenExpired = (tokenStr: string): boolean => {
    try {
      const payload = JSON.parse(atob(tokenStr.split('.')[1]));
      const exp = payload.exp * 1000; // 초 → 밀리초
      return Date.now() >= exp - 30000; // 30초 여유
    } catch {
      return true;
    }
  };

  /**
   * Direct 로그인 (커스텀 로그인 폼용)
   * Resource Owner Password Credentials Grant
   */
  const directLogin = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const tokenUrl = `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`;

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: keycloakConfig.clientId,
          username,
          password,
          scope: 'openid profile email',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = '로그인에 실패했습니다.';

        if (errorData.error === 'invalid_grant') {
          errorMessage = '아이디 또는 비밀번호가 올바르지 않습니다.';
        } else if (errorData.error_description) {
          errorMessage = errorData.error_description;
        }

        return { success: false, error: errorMessage };
      }

      const tokenData = await response.json();

      // 토큰 저장
      token.value = tokenData.access_token;
      refreshToken.value = tokenData.refresh_token;

      // 토큰에서 사용자 정보 추출
      const payload = JSON.parse(atob(tokenData.access_token.split('.')[1]));
      const realmAccess = payload.realm_access as { roles?: string[] } | undefined;
      const roles = realmAccess?.roles || [];

      currentUser.value = {
        id: 0,
        username: payload.preferred_username || '',
        email: payload.email || '',
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        role: roles.includes('ADMIN') ? 'ADMIN' :
              roles.includes('DEVELOPER') ? 'DEVELOPER' : 'USER',
        isActive: true,
        isVerified: true,
      };

      // localStorage에 저장
      localStorage.setItem('authToken', tokenData.access_token);
      localStorage.setItem('refreshToken', tokenData.refresh_token);
      localStorage.setItem('currentUser', JSON.stringify(currentUser.value));

      // API 클라이언트에 토큰 제공자 설정
      setTokenProvider(() => Promise.resolve(token.value));

      return { success: true };
    } catch (error) {
      console.error('Direct login failed:', error);
      return { success: false, error: '로그인 중 오류가 발생했습니다.' };
    }
  };

  /**
   * 토큰 갱신
   */
  const refreshTokens = async (): Promise<boolean> => {
    if (!refreshToken.value) {
      return false;
    }

    const tokenUrl = `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`;

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: keycloakConfig.clientId,
          refresh_token: refreshToken.value,
        }),
      });

      if (!response.ok) {
        console.warn('Token refresh failed');
        return false;
      }

      const tokenData = await response.json();

      // 토큰 업데이트
      token.value = tokenData.access_token;
      refreshToken.value = tokenData.refresh_token;

      // localStorage 업데이트
      localStorage.setItem('authToken', tokenData.access_token);
      localStorage.setItem('refreshToken', tokenData.refresh_token);

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  /**
   * 로그인 페이지로 리다이렉트
   */
  const login = (redirectUri?: string): void => {
    // auth-service의 로그인 페이지로 리다이렉트
    const authServiceUrl = process.env.VUE_APP_AUTH_SERVICE_URL || 'http://localhost:3001';
    const returnUrl = redirectUri || window.location.href;
    window.location.href = `${authServiceUrl}/login?redirect=${encodeURIComponent(returnUrl)}`;
  };

  /**
   * 로그아웃 (로컬 토큰 삭제)
   */
  const logout = async (redirectUri?: string): Promise<void> => {
    // Keycloak 로그아웃 엔드포인트 호출 (세션 종료)
    if (refreshToken.value) {
      try {
        const logoutUrl = `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/logout`;
        await fetch(logoutUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: keycloakConfig.clientId,
            refresh_token: refreshToken.value,
          }),
        });
      } catch (error) {
        console.warn('Keycloak logout request failed:', error);
      }
    }

    // 로컬 상태 초기화
    clearAuthState();

    // 리다이렉트
    if (redirectUri) {
      window.location.href = redirectUri;
    } else {
      // auth-service 로그인 페이지로 리다이렉트
      const authServiceUrl = process.env.VUE_APP_AUTH_SERVICE_URL || 'http://localhost:3001';
      window.location.href = `${authServiceUrl}/login`;
    }
  };

  /**
   * 인증 상태 초기화
   */
  const clearAuthState = (): void => {
    currentUser.value = null;
    token.value = null;
    refreshToken.value = null;

    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
  };

  /**
   * 회원가입 페이지로 리다이렉트
   */
  const register = (): void => {
    const authServiceUrl = process.env.VUE_APP_AUTH_SERVICE_URL || 'http://localhost:3001';
    window.location.href = `${authServiceUrl}/signup`;
  };

  /**
   * 인증 토큰 가져오기
   */
  const getToken = async (): Promise<string | null> => {
    if (!token.value) {
      return null;
    }

    // 토큰 만료 시 갱신
    if (isTokenExpired(token.value)) {
      const refreshed = await refreshTokens();
      if (!refreshed) {
        clearAuthState();
        return null;
      }
    }

    return token.value;
  };

  /**
   * 특정 역할 보유 여부 확인
   */
  const hasRole = (role: string): boolean => {
    if (!currentUser.value) {
      return false;
    }
    return currentUser.value.role === role;
  };

  /**
   * 관리자 여부 확인
   */
  const isAdmin = computed(() => {
    return hasRole('ADMIN') || hasRole('DEVELOPER');
  });

  return {
    // 상태
    currentUser: computed(() => currentUser.value),
    isAuthenticated,
    isAdmin,

    // 메서드
    initAuth,
    login,
    directLogin,
    logout,
    register,
    getToken,
    hasRole,
    refreshTokens,
  };
}
