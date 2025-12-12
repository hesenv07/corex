import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import MockAdapter from 'axios-mock-adapter';

import {
  getRefreshToken,
  getToken,
  removeRefreshToken,
  removeToken,
  setRefreshToken,
  setToken,
} from './token';

import type { BaseServiceOptions, HttpMethod, RequestConfig } from './types';

interface QueueItem {
  resolve: (v: any) => void;
  reject: (e: any) => void;
  config: AxiosRequestConfig & { _retry?: boolean };
}

export class BaseService {
  protected api = axios.create();
  private mock?: MockAdapter;

  /** new */
  private isPublic: boolean;

  /** refresh queue */
  private refreshing = false;
  private queue: QueueItem[] = [];

  constructor(options: BaseServiceOptions & { isPublic?: boolean }) {
    this.isPublic = !!options.isPublic;

    this.options = {
      version: 'v1',
      serviceName: 'api',
      useMock: false,
      mockDelay: 500,
      retryOnStatusCodes: [401],
      transformError: (err) => err.response?.data ?? { message: err.message },

      getAccessToken: () => getToken(options.tokenConfig),
      setAccessToken: (t) => setToken(t, options.tokenConfig),
      removeAccessToken: () => removeToken(options.tokenConfig),

      getRefreshToken: () => getRefreshToken(options.tokenConfig),
      setRefreshToken: (t) => setRefreshToken(t, options.tokenConfig),
      removeRefreshToken: () => removeRefreshToken(options.tokenConfig),

      logout: () => (window.location.href = '/login'),
      ...options,
    };

    this.api = axios.create({ baseURL: this.options.baseURL });

    if (this.options.useMock) this.enableMocking();
    this.setupInterceptors();
  }

  private options: BaseServiceOptions & Required<Pick<BaseServiceOptions,
    'getAccessToken' |
    'setAccessToken' |
    'removeAccessToken' |
    'getRefreshToken' |
    'setRefreshToken' |
    'removeRefreshToken' |
    'logout' |
    'transformError'
  >>;

  private enableMocking() {
    this.mock = new MockAdapter(this.api, {
      delayResponse: this.options.mockDelay,
      onNoMatch: 'passthrough',
    });
  }

  /** -----------------------------
   * INTERCEPTORS
   * ---------------------------- */
  private setupInterceptors() {
    this.api.interceptors.request.use((config) => {
      if (!this.isPublic) {
        const token = this.options.getAccessToken?.();
        if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` } as any;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (r) => r,
      async (err: AxiosError) => {
        const config = err.config as AxiosRequestConfig & { _retry?: boolean };
        if (!config || this.isPublic) return Promise.reject(err);

        const isRetryable =
          err.response?.status &&
          this.options.retryOnStatusCodes?.includes(err.response.status) &&
          !config._retry &&
          this.options.refreshToken;

        if (!isRetryable) return Promise.reject(err);

        config._retry = true;

        return new Promise((resolve, reject) => {
          this.queue.push({ resolve, reject, config });

          if (!this.refreshing) {
            this.refreshing = true;

            this.options
              .refreshToken!()
              .then(({ accessToken, refreshToken }) => {
                this.options.setAccessToken!(accessToken);
                if (refreshToken) this.options.setRefreshToken!(refreshToken);
                this.processQueue(null, accessToken);
              })
              .catch((e) => {
                this.processQueue(e);
                this.options.logout?.();
              })
              .finally(() => (this.refreshing = false));
          }
        });
      },
    );
  }

  private processQueue(error: any, token?: string) {
    this.queue.forEach(({ resolve, reject, config }) => {
      if (error) return reject(error);

      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
      resolve(this.api(config));
    });
    this.queue = [];
  }

  /** -----------------------------
   * GENERIC REQUEST LAYER
   * ---------------------------- */
  private buildUrl(endpoint: string, version?: string) {
    const v = version ?? this.options.version;
    return `${this.options.serviceName}/${v}/${endpoint.replace(/^\/+/, '')}`;
  }

  private addMock(method: HttpMethod, url: string, data: any, status = 200) {
    if (!this.mock) this.enableMocking();

    const m = `on${method[0].toUpperCase() + method.slice(1)}` as
      | 'onGet'
      | 'onPost'
      | 'onPut'
      | 'onDelete'
      | 'onPatch';

    (this.mock as any)[m](url).replyOnce(status, data);
  }

  protected async request<T>(method: HttpMethod, config: RequestConfig<T>): Promise<T> {
    const {
      endpoint,
      params,
      data,
      mockData,
      mockStatus = 200,
      isMock = false,
      version,
      includeHeaders = false,
      config: axiosCfg = {},
    } = config;

    const url = this.buildUrl(endpoint, version);

    if (mockData && (isMock || this.options.useMock)) {
      this.addMock(method, url, mockData, mockStatus);
    }

    try {
      const response: AxiosResponse<T> =
        method === 'get' || method === 'delete'
          ? await this.api[method](url, { params, ...axiosCfg })
          : await this.api[method](url, data, { params, ...axiosCfg });

      return includeHeaders
        ? ({ ...response.data, headers: response.headers } as T)
        : response.data;
    } catch (error) {
      throw this.options.transformError?.(error as AxiosError);
    }
  }

  public get<T>(config: RequestConfig<T>) {
    return this.request('get', config);
  }
  public post<T>(config: RequestConfig<T>) {
    return this.request('post', config);
  }
  public put<T>(config: RequestConfig<T>) {
    return this.request('put', config);
  }
  public patch<T>(config: RequestConfig<T>) {
    return this.request('patch', config);
  }
  public delete<T>(config: RequestConfig<T>) {
    return this.request('delete', config);
  }
}
