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

import {
  buildUrl,
  isCallingMethodPublic,
  registerMock,
  enableMocking,
  setupInterceptors,
  type InterceptorState,
} from './helpers';

export class BaseService {
  protected api: AxiosInstance;
  private mock?: MockAdapter;
  private interceptorState: InterceptorState;

  private options: {
    baseURL: string;
    version?: string;
    useMock: boolean;
    mockDelay: number;
    isPublic: boolean;
    serviceName?: string;
    prefix?: string;
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

  constructor(options: BaseServiceOptions) {
    this.interceptorState = {
      isRefreshing: false,
      failedQueue: [],
    };

    this.options = {
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

    if (this.options.useMock) {
      this.mock = enableMocking(this.api, this.options.mockDelay);
    }

    if (!this.options.isPublic) {
      setupInterceptors(
        this.api,
        {
          getAccessToken: this.options.getAccessToken!,
          setAccessToken: this.options.setAccessToken!,
          setRefreshToken: this.options.setRefreshToken,
          retryOnStatusCodes: this.options.retryOnStatusCodes!,
          refreshToken: this.options.refreshToken,
          logout: this.options.logout!,
        },
        this.interceptorState,
      );
    }
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

    const url = buildUrl(
      this.options.serviceName,
      version ?? this.options.version,
      endpoint,
      this.options.prefix,
    );

    if ((isMock || this.options.useMock) && mockData !== undefined) {
      if (!this.mock) {
        this.mock = enableMocking(this.api, this.options.mockDelay);
      }
      registerMock(this.mock, method, url, mockData, mockStatus);
    }

    const isDecoratorPublic = isCallingMethodPublic(this);
    const finalIsPublic = isPublic || isDecoratorPublic;

    const requestConfig: AxiosRequestConfig & { isPublic?: boolean } = {
      params,
      ...axiosConfig,
      isPublic: finalIsPublic,
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

export class ApiService extends BaseService {
  constructor(overrides: Partial<ServiceOverrides> = {}) {
    if (!sharedOptions)
      throw new Error('configureBaseService() not called. Please call it before using ApiService');
    super({ ...sharedOptions, ...overrides } as BaseServiceOptions);
  }
}
