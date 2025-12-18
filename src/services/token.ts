import { CookieManager, isBrowser } from 'everyday-helper';

import type { TokenConfig, SingleTokenConfig, TokenCookieOptions } from './types';

const DEFAULT_ACCESS_TOKEN_KEY = 'accessToken';
const DEFAULT_REFRESH_TOKEN_KEY = 'refreshToken';

const DEFAULT_COOKIE_OPTIONS: Required<TokenCookieOptions> = {
  path: '/',
  expires: 7,
  secure: true,
  httpOnly: false,
  sameSite: 'Strict' as const,
};

const DEFAULT_REFRESH_COOKIE_OPTIONS: Required<TokenCookieOptions> = {
  path: '/',
  expires: 30,
  secure: true,
  httpOnly: false,
  sameSite: 'Strict' as const,
};

let globalTokenConfig: Required<SingleTokenConfig> & {
  refreshToken?: Required<SingleTokenConfig>;
} = {
  storage: 'cookie',
  tokenKey: DEFAULT_ACCESS_TOKEN_KEY,
  cookieOptions: DEFAULT_COOKIE_OPTIONS,
  refreshToken: {
    storage: 'cookie',
    tokenKey: DEFAULT_REFRESH_TOKEN_KEY,
    cookieOptions: DEFAULT_REFRESH_COOKIE_OPTIONS,
  },
};

export const configureToken = (config: TokenConfig): void => {
  globalTokenConfig = {
    tokenKey: config.tokenKey || DEFAULT_ACCESS_TOKEN_KEY,
    storage: config.storage || 'cookie',
    cookieOptions: {
      ...DEFAULT_COOKIE_OPTIONS,
      ...config.cookieOptions,
    },
    refreshToken: config.refreshToken
      ? {
          tokenKey: config.refreshToken.tokenKey || DEFAULT_REFRESH_TOKEN_KEY,
          storage: config.refreshToken.storage || 'cookie',
          cookieOptions: {
            ...DEFAULT_REFRESH_COOKIE_OPTIONS,
            ...config.refreshToken.cookieOptions,
          },
        }
      : {
          storage: 'cookie',
          tokenKey: DEFAULT_REFRESH_TOKEN_KEY,
          cookieOptions: DEFAULT_REFRESH_COOKIE_OPTIONS,
        },
  };
};

const setTokenInStorage = (
  token: string,
  storage: 'cookie' | 'localStorage' | 'sessionStorage',
  tokenKey: string,
  cookieOptions?: TokenCookieOptions,
): void => {
  switch (storage) {
    case 'localStorage':
      if (isBrowser()) {
        localStorage.setItem(tokenKey, token);
      }
      break;
    case 'sessionStorage':
      if (isBrowser()) {
        sessionStorage.setItem(tokenKey, token);
      }
      break;
    case 'cookie':
    default:
      CookieManager.set(tokenKey, token, {
        ...DEFAULT_COOKIE_OPTIONS,
        ...cookieOptions,
      });
      break;
  }
};

const getTokenFromStorage = (
  storage: 'cookie' | 'localStorage' | 'sessionStorage',
  tokenKey: string,
): string | null => {
  switch (storage) {
    case 'localStorage':
      if (isBrowser()) {
        return localStorage.getItem(tokenKey) || null;
      }
      return null;
    case 'sessionStorage':
      if (isBrowser()) {
        return sessionStorage.getItem(tokenKey) || null;
      }
      return null;
    case 'cookie':
    default:
      return CookieManager.get(tokenKey);
  }
};

const removeTokenFromStorage = (
  storage: 'cookie' | 'localStorage' | 'sessionStorage',
  tokenKey: string,
  cookieOptions?: TokenCookieOptions,
): void => {
  switch (storage) {
    case 'localStorage':
      if (isBrowser()) {
        localStorage.removeItem(tokenKey);
      }
      break;
    case 'sessionStorage':
      if (isBrowser()) {
        sessionStorage.removeItem(tokenKey);
      }
      break;
    case 'cookie':
    default:
      CookieManager.remove(tokenKey, {
        path: cookieOptions?.path || '/',
      });
      break;
  }
};

export const setToken = (token: string, config?: TokenConfig): void => {
  const tokenConfig = config || globalTokenConfig;
  const tokenKey = tokenConfig.tokenKey || DEFAULT_ACCESS_TOKEN_KEY;
  const storage = tokenConfig.storage || 'cookie';
  setTokenInStorage(token, storage, tokenKey, tokenConfig.cookieOptions);
};

export const getToken = (config?: TokenConfig): string | null => {
  const tokenConfig = config || globalTokenConfig;
  const tokenKey = tokenConfig.tokenKey || DEFAULT_ACCESS_TOKEN_KEY;
  const storage = tokenConfig.storage || 'cookie';
  return getTokenFromStorage(storage, tokenKey);
};

export const removeToken = (config?: TokenConfig): void => {
  const tokenConfig = config || globalTokenConfig;
  const tokenKey = tokenConfig.tokenKey || DEFAULT_ACCESS_TOKEN_KEY;
  const storage = tokenConfig.storage || 'cookie';
  removeTokenFromStorage(storage, tokenKey, tokenConfig.cookieOptions);
};

export const setRefreshToken = (token: string, config?: TokenConfig): void => {
  const refreshConfig = config?.refreshToken || globalTokenConfig.refreshToken;
  if (!refreshConfig) return;

  const tokenKey = refreshConfig.tokenKey || DEFAULT_REFRESH_TOKEN_KEY;
  const storage = refreshConfig.storage || 'cookie';
  setTokenInStorage(token, storage, tokenKey, refreshConfig.cookieOptions);
};

export const getRefreshToken = (config?: TokenConfig): string | null => {
  const refreshConfig = config?.refreshToken || globalTokenConfig.refreshToken;
  if (!refreshConfig) return null;

  const tokenKey = refreshConfig.tokenKey || DEFAULT_REFRESH_TOKEN_KEY;
  const storage = refreshConfig.storage || 'cookie';
  return getTokenFromStorage(storage, tokenKey);
};

export const removeRefreshToken = (config?: TokenConfig): void => {
  const refreshConfig = config?.refreshToken || globalTokenConfig.refreshToken;
  if (!refreshConfig) return;

  const tokenKey = refreshConfig.tokenKey || DEFAULT_REFRESH_TOKEN_KEY;
  const storage = refreshConfig.storage || 'cookie';
  removeTokenFromStorage(storage, tokenKey, refreshConfig.cookieOptions);
};
