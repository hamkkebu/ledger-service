declare module 'keycloak-js' {
  export interface KeycloakConfig {
    url: string;
    realm: string;
    clientId: string;
  }

  export interface KeycloakInitOptions {
    onLoad?: 'check-sso' | 'login-required';
    silentCheckSsoRedirectUri?: string;
    checkLoginIframe?: boolean;
    pkceMethod?: 'S256';
    redirectUri?: string;
  }

  export interface KeycloakLoginOptions {
    redirectUri?: string;
    scope?: string;
  }

  export interface KeycloakLogoutOptions {
    redirectUri?: string;
  }

  export interface KeycloakRegisterOptions {
    redirectUri?: string;
  }

  export interface KeycloakTokenParsed {
    preferred_username?: string;
    email?: string;
    given_name?: string;
    family_name?: string;
    realm_access?: {
      roles?: string[];
    };
    exp?: number;
    [key: string]: unknown;
  }

  export default class Keycloak {
    constructor(config?: KeycloakConfig);

    token?: string;
    refreshToken?: string;
    tokenParsed?: KeycloakTokenParsed;
    authenticated?: boolean;

    init(options?: KeycloakInitOptions): Promise<boolean>;
    login(options?: KeycloakLoginOptions): void;
    logout(options?: KeycloakLogoutOptions): void;
    register(options?: KeycloakRegisterOptions): void;
    updateToken(minValidity: number): Promise<boolean>;
    hasRealmRole(role: string): boolean;
    accountManagement(): void;
  }
}

declare namespace Keycloak {
  export type KeycloakTokenParsed = import('keycloak-js').KeycloakTokenParsed;
}
