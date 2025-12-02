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
 * 초기화 진행 중인 Promise (중복 호출 방지)
 */
let initPromise: Promise<boolean> | null = null;

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
   * Keycloak 콜백 URL인지 확인
   */
  const isCallbackUrl = (): boolean => {
    const hash = window.location.hash;
    const search = window.location.search;
    return hash.includes('code=') || hash.includes('state=') ||
           search.includes('code=') || search.includes('state=');
  };

  /**
   * 콜백 파라미터 정리 (URL에서 OAuth 파라미터 제거)
   */
  const cleanupCallbackUrl = (): void => {
    const hash = window.location.hash;
    const search = window.location.search;

    // hash나 search에 OAuth 파라미터가 있으면 정리
    if (hash.includes('code=') || hash.includes('state=') ||
        hash.includes('session_state=') || hash.includes('iss=') ||
        search.includes('code=') || search.includes('state=')) {
      const cleanPath = window.location.pathname;
      window.history.replaceState({}, document.title, cleanPath);
    }
  };

  /**
   * 인증 초기화
   * Keycloak SSO 세션 확인 및 토큰 갱신
   */
  const initAuth = async (): Promise<boolean> => {
    // 이미 초기화됨
    if (isInitialized.value) {
      return keycloak.authenticated === true;
    }

    // 초기화 진행 중이면 기존 Promise 반환 (중복 호출 방지)
    if (initPromise) {
      return initPromise;
    }

    // 레거시 데이터 정리 (localStorage 사용하던 데이터)
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');

    const hasCallback = isCallbackUrl();

    // 초기화 Promise 생성 및 저장
    initPromise = (async () => {
      try {
        // 콜백 URL이 있으면 silentCheckSso를 사용하지 않음 (충돌 방지)
        const initOptions = hasCallback ? {
          checkLoginIframe: false,
          pkceMethod: 'S256' as const,
        } : {
          onLoad: 'check-sso' as const,
          silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
          checkLoginIframe: false,
          pkceMethod: 'S256' as const,
        };

        const authenticated = await keycloak.init(initOptions);

        isInitialized.value = true;
        isAuthenticatedRef.value = authenticated;

        // 콜백 URL 정리 (인증 성공 여부와 관계없이 항상 정리)
        if (hasCallback) {
          cleanupCallbackUrl();
        }

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

        // 콜백 URL 정리 (실패 시에도)
        if (hasCallback) {
          cleanupCallbackUrl();
        }

        return false;
      }
    })();

    return initPromise;
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
