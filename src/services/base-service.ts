import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type AxiosRequestConfig,
} from 'axios';

import MockAdapter from 'axios-mock-adapter';

import {
  getToken,
  setToken,
  removeToken,
  getRefreshToken,
  setRefreshToken,
  removeRefreshToken,
} from './token';

import type { HttpMethod, RequestConfig, BaseServiceOptions, ServiceOverrides } from './types';

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  isPublic?: boolean;
}

export class BaseService {
  protected api: AxiosInstance;
  private mock?: MockAdapter;

  private options: {
    baseURL: string;
    version: string;
    useMock: boolean;
    mockDelay: number;
    isPublic: boolean;
    serviceName: string;
    retryOnStatusCodes: number[];
    logout: () => void;
    removeAccessToken: () => void;
    removeRefreshToken: () => void;
    getAccessToken: () => string | null;
    getRefreshToken: () => string | null;
    setAccessToken: (token: string) => void;
    setRefreshToken: (token: string) => void;
    transformError: (error: AxiosError<any>) => any;
    tokenConfig?: BaseServiceOptions['tokenConfig'];
    refreshToken?: () => Promise<{ accessToken: string; refreshToken?: string }>;
  };

  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    config: CustomAxiosRequestConfig;
  }> = [];

  constructor(options: BaseServiceOptions) {
    this.options = {
      serviceName: 'api',
      version: 'v1',
      useMock: false,
      mockDelay: 1000,
      isPublic: false,
      retryOnStatusCodes: [401],
      transformError: (err) => err.response?.data ?? { message: err.message || 'Network error' },

      getAccessToken: () => getToken(options.tokenConfig),
      removeAccessToken: () => removeToken(options.tokenConfig),
      getRefreshToken: () => getRefreshToken(options.tokenConfig),
      removeRefreshToken: () => removeRefreshToken(options.tokenConfig),
      setAccessToken: (token: string) => setToken(token, options.tokenConfig),
      setRefreshToken: (token: string) => setRefreshToken(token, options.tokenConfig),

      logout: () => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },

      ...options,
    };

    this.api = axios.create({ baseURL: this.options.baseURL });

    if (this.options.useMock) this.enableMocking();

    if (!this.options.isPublic) {
      this.setupInterceptors();
    }
  }

  private enableMocking() {
    this.mock = new MockAdapter(this.api, {
      delayResponse: this.options.mockDelay,
      onNoMatch: 'passthrough',
    });
  }

  private setupInterceptors() {
    this.api.interceptors.request.use((config) => {
      if ((config as CustomAxiosRequestConfig).isPublic) {
        return config;
      }

      const token = this.options.getAccessToken!();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (res) => res,
      async (error: AxiosError) => {
        const config = error.config as CustomAxiosRequestConfig;
        if (!config) return Promise.reject(error);

        const shouldRetry =
          error.response?.status &&
          this.options.retryOnStatusCodes!.includes(error.response.status) &&
          !config._retry;

        if (shouldRetry && this.options.refreshToken) {
          config._retry = true;

          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject, config });

            if (!this.isRefreshing) {
              this.isRefreshing = true;
              this.options.refreshToken!()
                .then(({ accessToken, refreshToken }) => {
                  this.options.setAccessToken!(accessToken);
                  if (refreshToken) {
                    this.options.setRefreshToken!(refreshToken);
                  }
                  this.processQueue(null, accessToken);
                })
                .catch((err) => {
                  this.processQueue(err);
                  this.options.logout!();
                })
                .finally(() => (this.isRefreshing = false));
            }
          });
        }
        return Promise.reject(error);
      },
    );
  }

  private processQueue(error: any, token?: string) {
    this.failedQueue.forEach(({ resolve, reject, config }) => {
      if (error) reject(error);
      else {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        resolve(this.api(config));
      }
    });
    this.failedQueue = [];
  }

  private buildUrl(endpoint: string, version?: string) {
    const v = version ?? this.options.version;
    return `${this.options.serviceName}/${v}/${endpoint.replace(/^\/+/, '')}`;
  }

  private registerMock<T>(method: HttpMethod, url: string, data: T, status = 200) {
    if (!this.mock) this.enableMocking();
    const methodName = `on${method.charAt(0).toUpperCase() + method.slice(1)}` as
      | 'onGet'
      | 'onPost'
      | 'onPut'
      | 'onPatch'
      | 'onDelete';
    (this.mock![methodName] as any)(url).replyOnce(status, data);
  }

  protected async request<T>(method: HttpMethod, config: RequestConfig<T>): Promise<T> {
    const {
      endpoint,
      params,
      data,
      version,
      isMock = false,
      mockData,
      mockStatus = 200,
      includeHeaders = false,
      isPublic = false,
      config: axiosConfig = {},
    } = config;

    const url = this.buildUrl(endpoint, version);

    if ((isMock || this.options.useMock) && mockData !== undefined) {
      this.registerMock(method, url, mockData, mockStatus);
    }

    const requestConfig: CustomAxiosRequestConfig = {
      params,
      ...axiosConfig,
      isPublic,
    };

    try {
      const response: AxiosResponse<T> =
        method === 'get' || method === 'delete'
          ? await this.api[method](url, requestConfig)
          : await this.api[method](url, data ?? {}, requestConfig);

      return includeHeaders
        ? ({ ...response.data, headers: response.headers } as T)
        : response.data;
    } catch (error) {
      throw this.options.transformError(error as AxiosError<any>);
    }
  }

  public get<T>(config: RequestConfig<T>) {
    return this.request<T>('get', config);
  }
  public post<T>(config: RequestConfig<T>) {
    return this.request<T>('post', config);
  }
  public put<T>(config: RequestConfig<T>) {
    return this.request<T>('put', config);
  }
  public patch<T>(config: RequestConfig<T>) {
    return this.request<T>('patch', config);
  }
  public delete<T>(config: RequestConfig<T>) {
    return this.request<T>('delete', config);
  }

  public getAxiosInstance(): AxiosInstance {
    return this.api;
  }

  public getConfig(): typeof this.options {
    return this.options;
  }
}

type OverrideKeys =
  | 'serviceName'
  | 'version'
  | 'useMock'
  | 'mockDelay'
  | 'transformError'
  | 'retryOnStatusCodes';

let sharedOptions:
  | (Pick<BaseServiceOptions, 'baseURL'> &
      Partial<Omit<BaseServiceOptions, 'baseURL' | OverrideKeys>>)
  | null = null;

export const configureBaseService = (
  options: Pick<BaseServiceOptions, 'baseURL'> &
    Partial<Omit<BaseServiceOptions, 'baseURL' | OverrideKeys>>,
) => {
  sharedOptions = options;
};

export const createService = <T extends BaseService = BaseService>(
  overrides: Partial<ServiceOverrides> = {},
  BaseClass: new (opts: BaseServiceOptions) => T = BaseService as any,
): T => {
  if (!sharedOptions) {
    throw new Error('You must call configureBaseService() first');
  }
  return new BaseClass({ ...sharedOptions, ...overrides } as BaseServiceOptions);
};

export class ApiService extends BaseService {
  constructor(overrides: Partial<ServiceOverrides> = {}) {
    if (!sharedOptions)
      throw new Error('configureBaseService() not called. Please call it before using ApiService');
    super({ ...sharedOptions, ...overrides } as BaseServiceOptions);
  }
}

export const createServiceWithTokens = (overrides: Partial<ServiceOverrides> = {}) => {
  if (!sharedOptions) {
    throw new Error('You must call configureBaseService() first');
  }

  return new BaseService({
    ...sharedOptions,
    ...overrides,
    getAccessToken: () => getToken(sharedOptions?.tokenConfig),
    removeAccessToken: () => removeToken(sharedOptions?.tokenConfig),
    getRefreshToken: () => getRefreshToken(sharedOptions?.tokenConfig),
    removeRefreshToken: () => removeRefreshToken(sharedOptions?.tokenConfig),
    setAccessToken: (token: string) => setToken(token, sharedOptions?.tokenConfig),
    setRefreshToken: (token: string) => setRefreshToken(token, sharedOptions?.tokenConfig),
  } as BaseServiceOptions);
};
