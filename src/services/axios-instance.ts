import type {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import axios, { AxiosHeaders } from 'axios';

import { getToken, setToken } from './token';
import type { ApiServiceConfig, RefreshTokenResponse } from './types';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  isPublic?: boolean;
}

const refreshTokenRequest = async (
  baseUrl: string,
  endpoint: string,
  withCredentials: boolean,
  onFail?: () => void,
): Promise<string | null> => {
  try {
    const response = await axios.post<RefreshTokenResponse>(
      `${baseUrl}${endpoint}`,
      {},
      { withCredentials },
    );

    const newToken = response.data.accessToken;
    setToken(newToken);

    return newToken;
  } catch {
    onFail?.();
    return null;
  }
};

export const createAxiosInstance = (config: ApiServiceConfig): AxiosInstance => {
  const {
    baseUrl,
    headers = {},
    withCredentials = true,
    refreshTokenEndpoint = '/refresh',
    refreshTokenWithCredentials = true,
    onRefreshTokenFail,
    timeout = 30000,
  } = config;

  const api: AxiosInstance = axios.create({
    baseURL: baseUrl,
    timeout,
    withCredentials,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  /** -----------------------------
   * REQUEST INTERCEPTOR
   * ----------------------------*/
  api.interceptors.request.use(
    (req: CustomAxiosRequestConfig) => {
      if (req.isPublic) return req;

      const token = getToken(config.tokenConfig);
      if (token) {
        req.headers = new AxiosHeaders({
          ...req.headers,
          Authorization: `Bearer ${token}`,
        });
      }

      return req;
    },
    (error) => Promise.reject(error),
  );

  /** -----------------------------
   * RESPONSE INTERCEPTOR
   * ----------------------------*/
  api.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (error: AxiosError) => {
      const req = error.config as CustomAxiosRequestConfig;
      if (!req || req.isPublic) return Promise.reject(error);

      if (error.response?.status === 401 && !req._retry) {
        req._retry = true;

        const newToken = await refreshTokenRequest(
          baseUrl,
          refreshTokenEndpoint,
          refreshTokenWithCredentials,
          onRefreshTokenFail,
        );

        if (!newToken) return Promise.reject(error);

        req.headers = new AxiosHeaders({
          ...req.headers,
          Authorization: `Bearer ${newToken}`,
        });

        return api(req);
      }

      return Promise.reject(error);
    },
  );

  return api;
};
