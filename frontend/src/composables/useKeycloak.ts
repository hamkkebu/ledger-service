import { useState, useEffect, useCallback } from 'react';
import Keycloak from 'keycloak-js';

/**
 * Keycloak 설정 인터페이스
 */
interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}

/**
 * 사용자 정보 인터페이스
 */
interface KeycloakUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

/**
 * Keycloak 인스턴스 (싱글톤)
 */
let keycloakInstance: Keycloak | null = null;

/**
 * 초기화 Promise (이중 초기화 방지)
 */
let initPromise: Promise<boolean> | null = null;

/**
 * 상태 관리 (모듈 레벨 싱글톤)
 */
let internalState = {
  isInitialized: false,
  isAuthenticated: false,
  currentUser: null as KeycloakUser | null,
  token: null as string | null,
  refreshToken: null as string | null,
};

/**
 * 상태 변경 리스너들
 */
const stateListeners = new Set<() => void>();

const notifyStateChange = () => {
  stateListeners.forEach((listener) => listener());
};

/**
 * Direct Login 결과 인터페이스
 */
interface DirectLoginResult {
  success: boolean;
  error?: string;
}

/**
 * Direct Login 토큰 갱신 진행 중 플래그 (중복 호출 방지)
 */
let directLoginRefreshPromise: Promise<boolean> | null = null;

/**
 * JWT 토큰 만료 여부 확인
 * @param token JWT access_token
 * @param minValidSec 최소 유효 시간(초), 이 시간 이내로 만료되면 true
 */
function isJwtExpired(token: string, minValidSec = 30): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    if (!exp) return true;
    return Date.now() >= (exp - minValidSec) * 1000;
  } catch {
    return true;
  }
}

/**
 * Direct Login refresh_token을 사용한 토큰 갱신
 */
async function refreshDirectLoginToken(): Promise<boolean> {
  if (!internalState.refreshToken) return false;

  // 이미 갱신 중이면 기존 Promise 반환
  if (directLoginRefreshPromise) return directLoginRefreshPromise;

  directLoginRefreshPromise = (async () => {
    try {
      const config = defaultConfig;
      const tokenUrl = `${config.url}/realms/${config.realm}/protocol/openid-connect/token`;

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: config.clientId,
          refresh_token: internalState.refreshToken!,
        }),
      });

      if (!response.ok) {
        console.error('[DirectLogin] Token refresh failed:', response.status);
        clearAuthState();
        return false;
      }

      const tokenData = await response.json();

      // 새 토큰으로 상태 업데이트
      internalState.token = tokenData.access_token;
      internalState.refreshToken = tokenData.refresh_token;

      // 사용자 정보 업데이트
      const tokenParts = tokenData.access_token.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      const realmAccess = payload.realm_access as { roles?: string[] } | undefined;

      internalState.currentUser = {
        id: payload.sub || '',
        username: payload.preferred_username || '',
        email: payload.email || '',
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        roles: realmAccess?.roles || [],
      };

      notifyStateChange();
      console.log('[DirectLogin] Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('[DirectLogin] Token refresh error:', error);
      clearAuthState();
      return false;
    } finally {
      directLoginRefreshPromise = null;
    }
  })();

  return directLoginRefreshPromise;
}

/**
 * 기본 Keycloak 설정
 */
const defaultConfig: KeycloakConfig = {
  url: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8180',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'hamkkebu',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'hamkkebu-frontend',
};

/**
 * Keycloak Hook
 */
export function useKeycloak() {
  const [isInitialized, setIsInitialized] = useState(internalState.isInitialized);
  const [isAuthenticated, setIsAuthenticated] = useState(internalState.isAuthenticated);
  const [currentUser, setCurrentUser] = useState<KeycloakUser | null>(internalState.currentUser);
  const [token, setToken] = useState<string | null>(internalState.token);

  // Subscribe to state changes
  useEffect(() => {
    const listener = () => {
      setIsInitialized(internalState.isInitialized);
      setIsAuthenticated(internalState.isAuthenticated);
      setCurrentUser(internalState.currentUser);
      setToken(internalState.token);
    };

    stateListeners.add(listener);

    return () => {
      stateListeners.delete(listener);
    };
  }, []);

  /**
   * Keycloak 초기화
   * - 이중 초기화 방지 (React StrictMode 대응)
   * - URL에 콜백 파라미터가 있으면 자동 감지하여 처리
   */
  const init = useCallback(
    async (config: Partial<KeycloakConfig> = {}): Promise<boolean> => {
      // 이미 초기화 완료된 경우
      if (internalState.isInitialized && keycloakInstance) {
        return internalState.isAuthenticated;
      }

      // 이미 초기화 진행 중인 경우 (StrictMode 이중 호출 방지)
      if (initPromise) {
        return initPromise;
      }

      const finalConfig = { ...defaultConfig, ...config };

      keycloakInstance = new Keycloak({
        url: finalConfig.url,
        realm: finalConfig.realm,
        clientId: finalConfig.clientId,
      });

      // URL에 Keycloak 콜백 파라미터가 있는지 감지
      const hasCallbackParams = window.location.hash.includes('state=') &&
        (window.location.hash.includes('code=') || window.location.hash.includes('error='));

      initPromise = (async () => {
        try {
          const initOptions: any = {
            pkceMethod: 'S256',
            checkLoginIframe: false, // 서드파티 쿠키 차단 브라우저 호환성
          };

          if (hasCallbackParams) {
            // 콜백 파라미터가 있으면 check-sso 없이 초기화 (콜백 처리에 집중)
            // onLoad를 지정하지 않으면 콜백 파라미터만 처리함
          } else {
            // 콜백 파라미터가 없으면 SSO 세션 확인
            initOptions.onLoad = 'check-sso';
            initOptions.silentCheckSsoRedirectUri = window.location.origin + '/silent-check-sso.html';
          }

          const authenticated = await keycloakInstance!.init(initOptions);

          internalState.isInitialized = true;
          internalState.isAuthenticated = authenticated;

          if (authenticated) {
            updateUserInfo();
            setupTokenRefresh();

            // 콜백 파라미터 처리 후 URL 정리
            if (hasCallbackParams) {
              const cleanUrl = window.location.href.split('#')[0];
              window.history.replaceState({}, document.title, cleanUrl);
            }
          }

          // 토큰 만료 이벤트
          keycloakInstance!.onTokenExpired = async () => {
            console.log('Token expired, refreshing...');
            try {
              await keycloakInstance!.updateToken(30);
              updateUserInfo();
            } catch (e) {
              console.error('Token refresh on expiry failed:', e);
              clearAuthState();
            }
          };

          // 인증 에러 이벤트
          keycloakInstance!.onAuthError = (error) => {
            console.error('Auth error:', error);
            clearAuthState();
          };

          // 로그아웃 이벤트
          keycloakInstance!.onAuthLogout = () => {
            console.log('User logged out');
            clearAuthState();
            window.location.href = window.location.origin;
          };

          // 세션 상태 변경 이벤트 (다른 앱에서 로그아웃 시)
          keycloakInstance!.onAuthRefreshError = () => {
            console.log('Auth refresh error - session may have ended');
            clearAuthState();
            window.location.href = window.location.origin;
          };

          notifyStateChange();
          return authenticated;
        } catch (error) {
          console.error('Failed to initialize Keycloak:', error);
          internalState.isInitialized = true; // 실패해도 초기화 시도는 완료됨
          internalState.isAuthenticated = false;
          initPromise = null; // 재시도 가능하도록
          notifyStateChange();
          return false;
        }
      })();

      return initPromise;
    },
    []
  );

  /**
   * 로그인 (Keycloak 로그인 페이지로 리다이렉트)
   */
  const login = useCallback(async (redirectUri?: string): Promise<void> => {
    if (!keycloakInstance) {
      await init();
    }

    await keycloakInstance?.login({
      redirectUri: redirectUri || window.location.href,
    });
  }, [init]);

  /**
   * Direct Login (Resource Owner Password Credentials)
   * 커스텀 로그인 폼에서 사용자명/비밀번호를 직접 전송
   */
  const directLogin = useCallback(
    async (username: string, password: string): Promise<DirectLoginResult> => {
      const config = defaultConfig;
      const tokenUrl = `${config.url}/realms/${config.realm}/protocol/openid-connect/token`;

      try {
        const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'password',
            client_id: config.clientId,
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
        internalState.token = tokenData.access_token;
        internalState.refreshToken = tokenData.refresh_token;
        internalState.isAuthenticated = true;

        // 토큰 파싱하여 사용자 정보 추출
        const tokenParts = tokenData.access_token.split('.');
        const payload = JSON.parse(atob(tokenParts[1]));

        const realmAccess = payload.realm_access as { roles?: string[] } | undefined;
        const roles = realmAccess?.roles || [];

        internalState.currentUser = {
          id: payload.sub || '',
          username: payload.preferred_username || '',
          email: payload.email || '',
          firstName: payload.given_name || '',
          lastName: payload.family_name || '',
          roles,
        };

        // Keycloak 인스턴스 초기화 (세션 관리용)
        if (!keycloakInstance) {
          keycloakInstance = new Keycloak({
            url: config.url,
            realm: config.realm,
            clientId: config.clientId,
          });
        }

        // Direct Login 토큰 자동 갱신 설정
        setupDirectLoginTokenRefresh();

        notifyStateChange();
        return { success: true };
      } catch (error) {
        console.error('Direct login failed:', error);
        return { success: false, error: '로그인 중 오류가 발생했습니다.' };
      }
    },
    []
  );

  /**
   * 로그아웃
   * fetch POST로 Keycloak 세션 종료 후 리다이렉트
   */
  const logout = useCallback(async (redirectUri?: string): Promise<void> => {
    if (!keycloakInstance) {
      console.warn('[Keycloak] No keycloak instance - cannot logout');
      return;
    }

    const logoutEndpoint = `${defaultConfig.url}/realms/${defaultConfig.realm}/protocol/openid-connect/logout`;
    const logoutRedirectUri = redirectUri || (window.location.origin + '/');

    // refresh_token을 사용한 POST 방식 로그아웃 (가장 안정적)
    const refreshToken = keycloakInstance.refreshToken;

    if (refreshToken) {
      try {
        await fetch(logoutEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: defaultConfig.clientId,
            refresh_token: refreshToken,
          }),
          credentials: 'include',
        });
        console.log('[Keycloak] Logout POST succeeded');
      } catch (error) {
        console.warn('[Keycloak] Logout POST failed:', error);
      }
    }

    clearAuthState();
    window.location.href = logoutRedirectUri;
  }, []);

  /**
   * 회원가입 페이지로 이동
   */
  const register = useCallback(async (redirectUri?: string): Promise<void> => {
    if (!keycloakInstance) {
      await init();
    }

    await keycloakInstance?.register({
      redirectUri: redirectUri || window.location.href,
    });
  }, [init]);

  /**
   * 계정 관리 페이지로 이동
   */
  const accountManagement = useCallback(async (): Promise<void> => {
    if (!keycloakInstance) {
      return;
    }

    await keycloakInstance.accountManagement();
  }, []);

  /**
   * 토큰 갱신
   */
  const refreshTokens = useCallback(async (): Promise<boolean> => {
    if (!keycloakInstance) {
      return false;
    }

    try {
      const refreshed = await keycloakInstance.updateToken(30);
      if (refreshed) {
        updateUserInfo();
        console.log('Token refreshed');
      }
      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      clearAuthState();
      return false;
    }
  }, []);

  /**
   * 특정 역할 보유 여부 확인
   */
  const hasRole = useCallback((role: string): boolean => {
    // Direct Login으로 얻은 사용자 정보가 있는 경우
    if (internalState.currentUser?.roles) {
      return internalState.currentUser.roles.includes(role);
    }

    // Keycloak SSO로 인증된 경우
    return keycloakInstance?.hasRealmRole(role) || false;
  }, []);

  /**
   * 특정 리소스 역할 보유 여부 확인
   */
  const hasResourceRole = useCallback((role: string, resource: string): boolean => {
    return keycloakInstance?.hasResourceRole(role, resource) || false;
  }, []);

  /**
   * Access Token 가져오기
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    // Direct Login으로 얻은 토큰이 있는 경우
    if (internalState.token && !keycloakInstance?.authenticated) {
      // 토큰 만료 임박 시 갱신
      if (isJwtExpired(internalState.token, 30)) {
        const refreshed = await refreshDirectLoginToken();
        if (!refreshed) return null;
      }
      return internalState.token;
    }

    // Keycloak SSO로 얻은 토큰인 경우
    if (!keycloakInstance) {
      return null;
    }

    // 인증되지 않은 경우 null 반환
    if (!internalState.isAuthenticated) {
      return null;
    }

    try {
      // 토큰이 만료 예정이면 갱신
      if (keycloakInstance.isTokenExpired(30)) {
        await refreshTokens();
      }
    } catch (error) {
      console.debug('[Keycloak] Token refresh failed:', error);
      return null;
    }

    return keycloakInstance.token || null;
  }, [refreshTokens]);

  /**
   * Keycloak 인스턴스 가져오기 (고급 사용)
   */
  const getKeycloakInstance = useCallback((): Keycloak | null => {
    return keycloakInstance;
  }, []);

  return {
    // 상태
    isInitialized,
    isAuthenticated,
    currentUser,
    token,

    // 메서드
    init,
    login,
    directLogin,
    logout,
    register,
    accountManagement,
    refreshTokens,
    hasRole,
    hasResourceRole,
    getToken,
    getKeycloakInstance,
  };
}

/**
 * 사용자 정보 업데이트
 * Keycloak 모드에서는 localStorage를 사용하지 않음 (Keycloak이 세션 관리)
 */
function updateUserInfo(): void {
  if (!keycloakInstance || !keycloakInstance.tokenParsed) {
    return;
  }

  const tokenParsed = keycloakInstance.tokenParsed as Record<string, unknown>;

  internalState.token = keycloakInstance.token || null;
  internalState.refreshToken = keycloakInstance.refreshToken || null;

  // Realm roles 추출
  const realmAccess = tokenParsed.realm_access as { roles?: string[] } | undefined;
  const roles = realmAccess?.roles || [];

  internalState.currentUser = {
    id: keycloakInstance.subject || '',
    username: (tokenParsed.preferred_username as string) || '',
    email: (tokenParsed.email as string) || '',
    firstName: (tokenParsed.given_name as string) || '',
    lastName: (tokenParsed.family_name as string) || '',
    roles,
  };

  // Keycloak 모드에서는 localStorage 사용 안함
  // 토큰은 keycloak-js가 메모리에서 관리하고, 세션은 Keycloak 서버가 관리
  notifyStateChange();
}

/**
 * 인증 상태 초기화
 */
function clearAuthState(): void {
  internalState.isAuthenticated = false;
  internalState.currentUser = null;
  internalState.token = null;
  internalState.refreshToken = null;

  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('currentUser');

  notifyStateChange();
}

/**
 * Direct Login 토큰 자동 갱신 설정
 */
let directLoginRefreshInterval: ReturnType<typeof setInterval> | null = null;

function setupDirectLoginTokenRefresh(): void {
  if (directLoginRefreshInterval) return;

  directLoginRefreshInterval = setInterval(async () => {
    if (internalState.token && isJwtExpired(internalState.token, 60)) {
      console.log('[DirectLogin] Token expiring soon, refreshing...');
      const refreshed = await refreshDirectLoginToken();
      if (!refreshed) {
        if (directLoginRefreshInterval) {
          clearInterval(directLoginRefreshInterval);
          directLoginRefreshInterval = null;
        }
      }
    }
  }, 10000); // 10초마다 체크
}

/**
 * 토큰 자동 갱신 설정
 */
let tokenRefreshInterval: ReturnType<typeof setInterval> | null = null;

function setupTokenRefresh(): void {
  // 이미 설정된 경우 중복 방지
  if (tokenRefreshInterval) return;

  // 토큰 만료 1분 전에 자동 갱신
  tokenRefreshInterval = setInterval(async () => {
    if (keycloakInstance?.isTokenExpired(60)) {
      try {
        const refreshed = await keycloakInstance.updateToken(30);
        if (refreshed) {
          updateUserInfo();
          console.log('Token refreshed');
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
        clearAuthState();
      }
    }
  }, 10000); // 10초마다 체크
}
