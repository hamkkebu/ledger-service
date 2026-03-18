import { useState, useEffect, useMemo, useCallback } from 'react';
import { setTokenProvider } from '@/api/client';
import { useKeycloak } from './useKeycloak';
import type { AuthUser } from '@/types/domain.types';

/**
 * 인증 상태 관리 Hook
 *
 * Keycloak SSO 기반 인증을 제공합니다.
 */
export function useAuth() {
  const keycloak = useKeycloak();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Keycloak 초기화 완료 시 토큰 제공자 자동 설정
  useEffect(() => {
    if (keycloak.isInitialized && keycloak.isAuthenticated) {
      setTokenProvider(() => keycloak.getToken());
    }
  }, [keycloak.isInitialized, keycloak.isAuthenticated]);

  /**
   * 인증 초기화
   */
  const initAuth = useCallback(async (): Promise<boolean> => {
    // API 클라이언트에 토큰 제공자 설정
    setTokenProvider(() => keycloak.getToken());

    const authenticated = await keycloak.init();

    if (authenticated && keycloak.currentUser) {
      // Keycloak 사용자 정보를 AuthUser 형식으로 변환
      setCurrentUser({
        id: parseInt(keycloak.currentUser.id) || 0,
        username: keycloak.currentUser.username,
        email: keycloak.currentUser.email,
        firstName: keycloak.currentUser.firstName,
        lastName: keycloak.currentUser.lastName,
        role: keycloak.currentUser.roles.includes('ADMIN')
          ? 'ADMIN'
          : keycloak.currentUser.roles.includes('DEVELOPER')
          ? 'DEVELOPER'
          : 'USER',
        isActive: true,
        isVerified: true,
      });
    } else {
      setCurrentUser(null);
    }

    return authenticated;
  }, [keycloak]);

  /**
   * currentUser가 변경될 때마다 업데이트
   */
  useEffect(() => {
    if (keycloak.currentUser) {
      setCurrentUser({
        id: parseInt(keycloak.currentUser.id) || 0,
        username: keycloak.currentUser.username,
        email: keycloak.currentUser.email,
        firstName: keycloak.currentUser.firstName,
        lastName: keycloak.currentUser.lastName,
        role: keycloak.currentUser.roles.includes('ADMIN')
          ? 'ADMIN'
          : keycloak.currentUser.roles.includes('DEVELOPER')
          ? 'DEVELOPER'
          : 'USER',
        isActive: true,
        isVerified: true,
      });
    } else {
      setCurrentUser(null);
    }
  }, [keycloak.currentUser]);

  /**
   * 로그인 (Keycloak 로그인 페이지로 리다이렉트)
   */
  const login = useCallback(
    async (redirectUri?: string): Promise<void> => {
      await keycloak.login(redirectUri);
    },
    [keycloak]
  );

  /**
   * 로그아웃 (Keycloak SSO 로그아웃)
   */
  const logout = useCallback(
    async (redirectUri?: string): Promise<void> => {
      await keycloak.logout(redirectUri);
    },
    [keycloak]
  );

  /**
   * 회원가입 (Keycloak 회원가입 페이지로 리다이렉트)
   */
  const register = useCallback(
    async (redirectUri?: string): Promise<void> => {
      await keycloak.register(redirectUri);
    },
    [keycloak]
  );

  /**
   * 계정 관리 (Keycloak 계정 관리 페이지로 리다이렉트)
   */
  const accountManagement = useCallback(async (): Promise<void> => {
    await keycloak.accountManagement();
  }, [keycloak]);

  /**
   * 인증 토큰 가져오기
   */
  const getToken = useCallback(
    async (): Promise<string | null> => {
      return await keycloak.getToken();
    },
    [keycloak]
  );

  /**
   * 특정 역할 보유 여부 확인
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      return keycloak.hasRole(role);
    },
    [keycloak]
  );

  /**
   * 관리자 여부 확인
   */
  const isAdmin = useMemo(() => {
    return hasRole('ADMIN') || hasRole('DEVELOPER');
  }, [hasRole]);

  /**
   * 인증 상태 확인
   */
  const isAuthenticated = useMemo(() => {
    return currentUser !== null;
  }, [currentUser]);

  return {
    // 상태
    currentUser,
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
