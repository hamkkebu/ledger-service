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
const token = ref<string | null>(null);
const refreshToken = ref<string | null>(null);

/**
 * JWT 토큰에서 사용자 정보 추출
 * localStorage에 별도 저장하지 않고 토큰에서 직접 파싱
 */
const parseUserFromToken = (tokenStr: string): AuthUser | null => {
  try {
    const payload = JSON.parse(atob(tokenStr.split('.')[1]));
    const realmAccess = payload.realm_access as { roles?: string[] } | undefined;
    const roles = realmAccess?.roles || [];

    return {
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
  } catch {
    return null;
  }
};

/**
 * 현재 사용자 정보 (토큰에서 실시간 파싱)
 */
const currentUser = computed<AuthUser | null>(() => {
  if (!token.value) return null;
  return parseUserFromToken(token.value);
});

const isAuthenticated = computed(() => token.value !== null && currentUser.value !== null);

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
   * URL 파라미터 또는 localStorage에서 토큰 복원 (사용자 정보는 토큰에서 파싱)
   * 크로스 도메인 인증: auth-service에서 전달된 토큰을 URL 파라미터로 수신
   */
  const initAuth = async (): Promise<boolean> => {
    // API 클라이언트에 토큰 제공자 설정
    setTokenProvider(() => Promise.resolve(token.value));

    // 레거시 데이터 정리 (보안 강화)
    localStorage.removeItem('currentUser');

    // 1. URL Fragment에서 토큰 확인 (크로스 도메인 인증)
    // Fragment(#)는 서버로 전송되지 않으므로 쿼리스트링보다 안전
    // - 서버 로그에 기록되지 않음
    // - Referer 헤더에 포함되지 않음
    const hash = window.location.hash.substring(1); // # 제거
    const fragmentParams = new URLSearchParams(hash);
    const urlToken = fragmentParams.get('token');
    const urlRefreshToken = fragmentParams.get('refreshToken');

    if (urlToken) {
      // URL Fragment에서 토큰을 받은 경우 localStorage에 저장하고 URL 정리
      token.value = urlToken;
      refreshToken.value = urlRefreshToken;

      localStorage.setItem('authToken', urlToken);
      if (urlRefreshToken) {
        localStorage.setItem('refreshToken', urlRefreshToken);
      }

      // URL에서 토큰 Fragment 제거 (보안 및 UX)
      const cleanUrl = window.location.pathname + window.location.search;
      window.history.replaceState({}, document.title, cleanUrl);

      // 토큰 유효성 검증
      if (!isTokenExpired(urlToken) && currentUser.value) {
        return true;
      }
    }

    // 2. localStorage에서 토큰 복원
    const savedToken = localStorage.getItem('authToken');
    const savedRefreshToken = localStorage.getItem('refreshToken');

    if (savedToken) {
      token.value = savedToken;
      refreshToken.value = savedRefreshToken;

      // 토큰 유효성 검증 (만료 체크)
      if (isTokenExpired(savedToken)) {
        // 토큰 만료 시 갱신 시도
        const refreshed = await refreshTokens();
        if (!refreshed) {
          clearAuthState();
          return false;
        }
      }

      // 토큰에서 사용자 정보 파싱 가능한지 확인
      if (currentUser.value) {
        return true;
      } else {
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

      // 토큰 저장 (currentUser는 토큰에서 자동 파싱됨)
      token.value = tokenData.access_token;
      refreshToken.value = tokenData.refresh_token;

      // localStorage에 토큰만 저장 (보안: currentUser는 저장하지 않음)
      localStorage.setItem('authToken', tokenData.access_token);
      localStorage.setItem('refreshToken', tokenData.refresh_token);

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
      // auth-service 로그아웃 페이지로 리다이렉트 (크로스 도메인 로그아웃)
      // auth-service의 localStorage도 함께 정리됨
      const authServiceUrl = process.env.VUE_APP_AUTH_SERVICE_URL || 'http://localhost:3001';
      window.location.href = `${authServiceUrl}/logout`;
    }
  };

  /**
   * 인증 상태 초기화
   */
  const clearAuthState = (): void => {
    token.value = null;
    refreshToken.value = null;

    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser'); // 레거시 데이터 정리
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
