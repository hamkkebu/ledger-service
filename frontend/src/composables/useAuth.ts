import { ref, computed } from 'vue';
import { setTokenProvider } from '@/api/client';
import { useKeycloak } from '@common/composables/useKeycloak';

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
 * 인증 상태 관리 Composable
 *
 * Keycloak SSO 기반 인증을 제공합니다.
 */
const currentUser = ref<AuthUser | null>(null);
const isAuthenticated = computed(() => currentUser.value !== null);

export function useAuth() {
  const keycloak = useKeycloak();

  /**
   * 인증 초기화
   */
  const initAuth = async (): Promise<boolean> => {
    // API 클라이언트에 토큰 제공자 설정
    setTokenProvider(() => keycloak.getToken());

    const authenticated = await keycloak.init();

    if (authenticated && keycloak.currentUser.value) {
      // Keycloak 사용자 정보를 AuthUser 형식으로 변환
      currentUser.value = {
        id: parseInt(keycloak.currentUser.value.id) || 0,
        username: keycloak.currentUser.value.username,
        email: keycloak.currentUser.value.email,
        firstName: keycloak.currentUser.value.firstName,
        lastName: keycloak.currentUser.value.lastName,
        role: keycloak.currentUser.value.roles.includes('ADMIN') ? 'ADMIN' :
              keycloak.currentUser.value.roles.includes('DEVELOPER') ? 'DEVELOPER' : 'USER',
        isActive: true,
        isVerified: true,
      };
    } else {
      currentUser.value = null;
    }

    return authenticated;
  };

  /**
   * 로그인 (Keycloak 로그인 페이지로 리다이렉트)
   */
  const login = async (redirectUri?: string): Promise<void> => {
    await keycloak.login(redirectUri);
  };

  /**
   * 로그아웃 (Keycloak SSO 로그아웃)
   */
  const logout = async (redirectUri?: string): Promise<void> => {
    await keycloak.logout(redirectUri);
  };

  /**
   * 회원가입 (Keycloak 회원가입 페이지로 리다이렉트)
   */
  const register = async (redirectUri?: string): Promise<void> => {
    await keycloak.register(redirectUri);
  };

  /**
   * 계정 관리 (Keycloak 계정 관리 페이지로 리다이렉트)
   */
  const accountManagement = async (): Promise<void> => {
    await keycloak.accountManagement();
  };

  /**
   * 인증 토큰 가져오기
   */
  const getToken = async (): Promise<string | null> => {
    return await keycloak.getToken();
  };

  /**
   * 특정 역할 보유 여부 확인
   */
  const hasRole = (role: string): boolean => {
    return keycloak.hasRole(role);
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
    logout,
    register,
    accountManagement,
    getToken,
    hasRole,
  };
}
