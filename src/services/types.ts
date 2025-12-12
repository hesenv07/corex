import type { AxiosError, AxiosRequestConfig } from 'axios';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface TokenCookieOptions {
  path?: string;
  secure?: boolean;
  expires?: number;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface SingleTokenConfig {
  tokenKey?: string;
  cookieOptions?: TokenCookieOptions;
  storage?: 'cookie' | 'localStorage' | 'sessionStorage';
}

export interface TokenConfig extends SingleTokenConfig {
  refreshToken?: {
    tokenKey?: string;
    cookieOptions?: TokenCookieOptions;
    storage?: 'cookie' | 'localStorage' | 'sessionStorage';
  };
}

export interface RequestConfig<T = any> {
  data?: any;
  mockData?: T;
  endpoint: string;
  version?: string;
  isMock?: boolean;
  mockStatus?: number;
  includeHeaders?: boolean;
  config?: AxiosRequestConfig;
  params?: Record<string, any>;
}

export interface BaseServiceOptions {
  baseURL: string;

  isPublic?: boolean

  version?: string;
  serviceName?: string;

  removeAccessToken?: () => void;
  removeRefreshToken?: () => void;
  getAccessToken?: () => string | null;
  getRefreshToken?: () => string | null;
  setAccessToken?: (token: string) => void;
  setRefreshToken?: (token: string) => void;

  logout?: () => void;
  refreshToken?: () => Promise<{ accessToken: string; refreshToken?: string }>;

  retryOnStatusCodes?: number[];

  useMock?: boolean;
  mockDelay?: number;

  transformError?: (error: AxiosError<any>) => any;

  tokenConfig?: TokenConfig;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export type ServiceOverrides = Pick<
  BaseServiceOptions,
  'serviceName' | 'version' | 'useMock' | 'mockDelay' | 'transformError' | 'retryOnStatusCodes'
>;

export interface ApiServiceConfig {
  baseUrl: string;
  timeout?: number;
  withCredentials?: boolean;
  tokenConfig?: TokenConfig;
  refreshTokenEndpoint?: string;
  onRefreshTokenFail?: () => void;
  headers?: Record<string, string>;
  refreshTokenWithCredentials?: boolean;
  isPublic?: boolean
}
