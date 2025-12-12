import axios, { AxiosHeaders } from 'axios';

import type { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { getToken, setToken } from './token';

import type { ApiServiceConfig, RefreshTokenResponse } from './types';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const refreshToken = async (
  baseUrl: string,
  refreshEndpoint: string,
  withCredentials: boolean = true,
  onRefreshTokenFail?: () => void,
): Promise<string | null> => {
  try {
    const response = await axios.post<RefreshTokenResponse>(
      `${baseUrl}${refreshEndpoint}`,
      {},
      { withCredentials },
    );
    setToken(response.data.accessToken);
    return response.data.accessToken;
  } catch (error) {
    if (onRefreshTokenFail) {
      onRefreshTokenFail();
    } else {
      window.location.href = '/login';
    }
    return null;
  }
};

export const createAxiosInstance = (config: ApiServiceConfig): AxiosInstance => {
  const {
    baseUrl,
    headers = {},
    withCredentials = true,
    refreshTokenWithCredentials = true,
    timeout = 30000,
    refreshTokenEndpoint = '/refresh',
    onRefreshTokenFail,
    isPublic = true
  } = config;

  const api: AxiosInstance = axios.create({
    baseURL: baseUrl,
    withCredentials,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  api.interceptors.request.use(
    (requestConfig: CustomAxiosRequestConfig): CustomAxiosRequestConfig => {

      if (isPublic) return requestConfig;

      const token = getToken(config.tokenConfig);

      if (token) {
        requestConfig.headers = new AxiosHeaders({
          ...requestConfig.headers,
          Authorization: `Bearer ${token}`,
        });
      }

      return requestConfig;
    },
    (error: AxiosError) => Promise.reject(error),
  );

  api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as CustomAxiosRequestConfig;

      if (isPublic) {
        return Promise.reject(error);
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const newToken = await refreshToken(
          baseUrl,
          refreshTokenEndpoint,
          refreshTokenWithCredentials,
          onRefreshTokenFail,
        );

        if (newToken) {
          originalRequest.headers = new AxiosHeaders({
            ...originalRequest.headers,
            Authorization: `Bearer ${newToken}`,
          });

          return api(originalRequest);
        }
      }

      return Promise.reject(error);
    },
  );

  return api;
};
