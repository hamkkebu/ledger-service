import { ref, computed } from 'vue';
import Keycloak from 'keycloak-js';
import { setTokenProvider } from '@/api/client';

/**
 * Keycloak 인스턴스 (싱글톤)
 */
let keycloakInstance: Keycloak | null = null;

/**
 * 인증 상태 (싱글톤)
 */
const isInitialized = ref(false);
const isAuthenticatedRef = ref(false);

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
 * Keycloak 인스턴스 생성
 */
const createKeycloakInstance = (): Keycloak => {
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak({
      url: process.env.VUE_APP_KEYCLOAK_URL || 'http://localhost:8180',
      realm: process.env.VUE_APP_KEYCLOAK_REALM || 'hamkkebu',
      clientId: process.env.VUE_APP_KEYCLOAK_CLIENT_ID || 'hamkkebu-frontend',
    });
  }
  return keycloakInstance;
};

/**
 * 토큰에서 사용자 정보 추출
 */
const parseUserFromToken = (tokenParsed: Keycloak.KeycloakTokenParsed | undefined): AuthUser | null => {
  if (!tokenParsed) return null;

  try {
    const realmAccess = tokenParsed.realm_access as { roles?: string[] } | undefined;
    const roles = realmAccess?.roles || [];

    return {
      id: 0,
      username: tokenParsed.preferred_username || '',
      email: tokenParsed.email || '',
      firstName: tokenParsed.given_name || '',
      lastName: tokenParsed.family_name || '',
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
 * 현재 사용자 정보
 */
const currentUser = computed<AuthUser | null>(() => {
  if (!keycloakInstance || !keycloakInstance.authenticated) return null;
  return parseUserFromToken(keycloakInstance.tokenParsed);
});

/**
 * 인증 여부
 */
const isAuthenticated = computed(() => {
  return isAuthenticatedRef.value && keycloakInstance?.authenticated === true;
});

/**
 * 인증 상태 관리 Composable
 *
 * Keycloak SSO 기반 인증을 제공합니다.
 * - 로그인: Keycloak 로그인 페이지로 리다이렉트
 * - 로그아웃: Keycloak 세션 종료 + 리다이렉트
 * - SSO: Keycloak 세션 쿠키로 자동 인증
 */
export function useAuth() {
  const keycloak = createKeycloakInstance();

  /**
   * 인증 초기화
   * Keycloak SSO 세션 확인 및 토큰 갱신
   */
  const initAuth = async (): Promise<boolean> => {
    if (isInitialized.value) {
      return keycloak.authenticated === true;
    }

    // 레거시 데이터 정리 (localStorage 사용하던 데이터)
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');

    try {
      // check-sso: 로그인 페이지로 리다이렉트하지 않고 SSO 세션만 확인
      const authenticated = await keycloak.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        checkLoginIframe: false,
        pkceMethod: 'S256',
      });

      isInitialized.value = true;
      isAuthenticatedRef.value = authenticated;

      if (authenticated) {
        // API 클라이언트에 토큰 제공자 설정
        setTokenProvider(() => getToken());

        // 토큰 자동 갱신 설정
        setupTokenRefresh();
      }

      return authenticated;
    } catch (error) {
      console.error('Keycloak init failed:', error);
      isInitialized.value = true;
      isAuthenticatedRef.value = false;
      return false;
    }
  };

  /**
   * 토큰 자동 갱신 설정
   */
  const setupTokenRefresh = (): void => {
    // 토큰 만료 60초 전에 갱신
    setInterval(async () => {
      if (keycloak.authenticated) {
        try {
          const refreshed = await keycloak.updateToken(60);
          if (refreshed) {
            console.debug('Token refreshed');
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          isAuthenticatedRef.value = false;
        }
      }
    }, 30000); // 30초마다 체크
  };

  /**
   * 로그인 (Keycloak 로그인 페이지로 리다이렉트)
   */
  const login = (redirectUri?: string): void => {
    keycloak.login({
      redirectUri: redirectUri || window.location.href,
    });
  };

  /**
   * 회원가입 (Keycloak 회원가입 페이지로 리다이렉트)
   */
  const register = (): void => {
    keycloak.register({
      redirectUri: window.location.origin,
    });
  };

  /**
   * 로그아웃 (Keycloak 세션 종료)
   */
  const logout = async (redirectUri?: string): Promise<void> => {
    isAuthenticatedRef.value = false;

    keycloak.logout({
      redirectUri: redirectUri || window.location.origin,
    });
  };

  /**
   * 인증 토큰 가져오기
   * 만료 임박 시 자동 갱신
   */
  const getToken = async (): Promise<string | null> => {
    if (!keycloak.authenticated) {
      return null;
    }

    try {
      // 토큰 만료 30초 전에 갱신
      await keycloak.updateToken(30);
      return keycloak.token || null;
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  };

  /**
   * 특정 역할 보유 여부 확인
   */
  const hasRole = (role: string): boolean => {
    return keycloak.hasRealmRole(role);
  };

  /**
   * 관리자 여부 확인
   */
  const isAdmin = computed(() => {
    return hasRole('ADMIN') || hasRole('DEVELOPER');
  });

  /**
   * 계정 관리 페이지로 이동
   */
  const accountManagement = (): void => {
    keycloak.accountManagement();
  };

  return {
    // 상태
    currentUser,
    isAuthenticated,
    isAdmin,
    isInitialized: computed(() => isInitialized.value),

    // 메서드
    initAuth,
    login,
    logout,
    register,
    getToken,
    hasRole,
    accountManagement,
  };
}
