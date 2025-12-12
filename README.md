# Servios

> Zero-config, production-ready HTTP client for modern applications

[![npm version](https://img.shields.io/npm/v/servios.svg)](https://www.npmjs.com/package/servios)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

Servios is a lightweight library providing essential building blocks for modern applications: API abstractions, token handling, and utility functions.

## ✨ Features

- 🚀 **Zero-config** - Only `baseURL` required, everything else optional
- 🔄 **Auto token refresh** - Handles 401 errors automatically with queue management
- 🎭 **Mock support** - Built-in mock adapter for dev/testing
- 🌐 **Smart URLs** - `{baseURL}/{serviceName}/{version}/{endpoint}`
- 🔐 **Flexible token storage** - Cookie, localStorage, or sessionStorage
- 🔓 **Public API support** - Per-request or service-level unauthenticated calls
- ⚡ **TypeScript first** - Full type safety and excellent IDE support

---

## 📦 Installation

```bash
npm install servios
# or
yarn add servios
```

---

## 🚀 Quick Start

### 1. Configure Service (Once)

```typescript
// src/api/config.ts
import { configureBaseService } from 'servios';

configureBaseService({
  baseURL: 'https://api.example.com', // Only required field!

  // Optional: Token handlers (defaults provided)
  getAccessToken: () => localStorage.getItem('token'),
  setAccessToken: (token) => localStorage.setItem('token', token),
  removeAccessToken: () => localStorage.removeItem('token'),

  // Optional: Refresh on 401
  async refreshToken() {
    const res = await fetch('/auth/refresh', { credentials: 'include' });
    const data = await res.json();
    return { accessToken: data.accessToken };
  },

  // Optional: Logout handler
  logout: () => (window.location.href = '/login'),
});
```

### 2. Create Service

```typescript
// src/api/services/UserService.ts
import { ApiService } from 'servios';

export class UserService extends ApiService {
  constructor() {
    super({
      serviceName: 'users',
      version: 'v2', // default: 'v1'
    });
  }

  getMe() {
    return this.get({ endpoint: 'me' });
    // GET: https://api.example.com/users/v2/me
  }

  updateProfile(data: any) {
    return this.patch({ endpoint: 'profile', data });
    // PATCH: https://api.example.com/users/v2/profile
  }
}

export default new UserService();
```

### 3. Use in Components

```typescript
import userService from '@/api/services/UserService';

async function loadProfile() {
  const { user } = await userService.getMe();
  console.log(user);
}
```

---

## 📖 API Reference

### Service Configuration

```typescript
configureBaseService({
  // ✅ Required
  baseURL: string;

  // Optional - Service
  serviceName?: string;              // Default: 'api'
  version?: string;                  // Default: 'v1'
  isPublic?: boolean;                // Default: false - Skip auth for all requests

  // Optional - Token handlers
  getAccessToken?: () => string | null;
  setAccessToken?: (token: string) => void;
  removeAccessToken?: () => void;
  getRefreshToken?: () => string | null;
  setRefreshToken?: (token: string) => void;
  removeRefreshToken?: () => void;

  // Optional - Auth
  refreshToken?: () => Promise<{ accessToken: string; refreshToken?: string }>;
  logout?: () => void;
  retryOnStatusCodes?: number[];     // Default: [401]

  // Optional - Mock
  useMock?: boolean;                 // Default: false
  mockDelay?: number;                // Default: 1000ms

  // Optional - Error handling
  transformError?: (error: AxiosError) => any;

  // Optional - Token storage config
  tokenConfig?: TokenConfig;
});
```

### Token Configuration

```typescript
interface TokenConfig {
  // Access token
  tokenKey?: string; // Default: 'accessToken'
  storage?: 'cookie' | 'localStorage' | 'sessionStorage'; // Default: 'cookie'
  cookieOptions?: {
    path?: string; // Default: '/'
    secure?: boolean; // Default: true
    expires?: number; // Default: 7 days
    sameSite?: 'Strict' | 'Lax' | 'None';
  };

  // Refresh token (separate storage)
  refreshToken?: {
    tokenKey?: string; // Default: 'refreshToken'
    storage?: 'cookie' | 'localStorage' | 'sessionStorage';
    cookieOptions?: {
      /* same as above */
    }; // Default: 30 days
  };
}
```

### HTTP Methods

```typescript
class UserService extends ApiService {
  // GET
  getUsers() {
    return this.get({ endpoint: 'list', params: { page: 1 } });
  }

  // POST
  createUser(data: any) {
    return this.post({ endpoint: 'create', data });
  }

  // PUT
  replaceUser(id: string, data: any) {
    return this.put({ endpoint: id, data });
  }

  // PATCH
  updateUser(id: string, data: any) {
    return this.patch({ endpoint: id, data });
  }

  // DELETE
  deleteUser(id: string) {
    return this.delete({ endpoint: id });
  }
}
```

### RequestConfig Options

```typescript
{
  endpoint: string;                  // Required
  params?: Record<string, any>;      // Query params
  data?: any;                        // Request body
  version?: string;                  // Override version
  isPublic?: boolean;                // Skip authentication for this request
  isMock?: boolean;                  // Mock this request
  mockData?: T;                      // Mock response
  mockStatus?: number;               // Mock status code
  includeHeaders?: boolean;          // Include headers in response
  config?: AxiosRequestConfig;       // Raw axios config
}
```

---

## 🎭 Mock Support

```typescript
class UserService extends ApiService {
  constructor() {
    super({
      serviceName: 'users',
      useMock: import.meta.env.DEV, // Mock in development
      mockDelay: 1500,
    });
  }

  getMe() {
    return this.get({
      endpoint: 'me',
      isMock: true,
      mockData: { user: { id: '1', name: 'Test User' } },
      mockStatus: 200,
    });
  }
}
```

---

## 🔐 Manual Token Management

```typescript
import { setToken, getToken, removeToken, setRefreshToken, getRefreshToken } from 'servios';

// Access token
setToken('eyJhbGc...');
const token = getToken();
removeToken();

// Refresh token
setRefreshToken('refresh_xyz...');
const refresh = getRefreshToken();
```

---

## 🛠️ Advanced Features

### Public API Requests

You can make unauthenticated (public) requests in two ways:

#### Per-Request Level

```typescript
class OrgService extends ApiService {
  constructor() {
    super({ serviceName: 'org' });
  }

  // Public endpoint - no token sent
  getPublicOrgs() {
    return this.get({
      endpoint: 'list',
      isPublic: true
    });
  }

  // Authenticated endpoint - token sent
  updateOrg(data: any) {
    return this.put({
      endpoint: 'update',
      data
    });
  }
}
```

#### Service Level

```typescript
// All requests in this service are public
class PublicApiService extends ApiService {
  constructor() {
    super({
      serviceName: 'public',
      isPublic: true  // No authentication for any request
    });
  }

  getNews() {
    return this.get({ endpoint: 'news' });
  }

  getArticle(id: string) {
    return this.get({ endpoint: `articles/${id}` });
  }
}
```

### Custom Error Transform

```typescript
configureBaseService({
  baseURL: 'https://api.example.com',
  transformError: (error) => ({
    success: false,
    message: error.response?.data?.message || 'Error',
    status: error.response?.status,
  }),
});
```

### Custom Retry Status Codes

```typescript
configureBaseService({
  baseURL: 'https://api.example.com',
  retryOnStatusCodes: [401, 403, 503],
});
```

### Include Response Headers

```typescript
const response = await service.get({
  endpoint: 'me',
  includeHeaders: true,
});

console.log(response.headers['x-rate-limit']);
```

### Access Axios Instance

```typescript
class CustomService extends ApiService {
  constructor() {
    super({ serviceName: 'custom' });

    const axios = this.getAxiosInstance();
    axios.interceptors.request.use((config) => {
      config.headers['X-Custom'] = 'value';
      return config;
    });
  }
}
```

---

## 📚 Examples

### Complete Setup

```typescript
// config.ts
import { configureBaseService, configureToken } from 'servios';

configureToken({
  storage: 'cookie',
  refreshToken: {
    storage: 'cookie',
    cookieOptions: { secure: true, expires: 30 },
  },
});

configureBaseService({
  baseURL: import.meta.env.VITE_API_URL,
  async refreshToken() {
    const res = await fetch('/auth/refresh', { credentials: 'include' });
    return await res.json();
  },
  logout: () => (window.location.href = '/login'),
  retryOnStatusCodes: [401],
  transformError: (err) => ({
    message: err.response?.data?.message || 'Error',
  }),
});
```

### Service with Mock

```typescript
// UserService.ts
export class UserService extends ApiService {
  constructor() {
    super({
      serviceName: 'users',
      version: 'v2',
      useMock: import.meta.env.DEV,
    });
  }

  getUsers(params?: { page?: number }) {
    return this.get({
      endpoint: 'list',
      params,
      isMock: true,
      mockData: {
        users: [{ id: '1', name: 'Test' }],
        total: 1,
      },
    });
  }
}
```

---

## 📝 TypeScript

Full TypeScript support with excellent IDE autocomplete:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

class UserService extends ApiService {
  async getUser(id: string): Promise<{ user: User }> {
    return this.get<{ user: User }>({ endpoint: id });
  }
}
```

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## 📄 License

MIT © [Arif Hasanov](https://github.com/hesenv07)

---

## 🔗 Links

- [GitHub](https://github.com/hesenv07/servios)
- [npm](https://www.npmjs.com/package/servios)
- [Issues](https://github.com/hesenv07/servios/issues)
- [Changelog](./CHANGELOG.md)
- [Publishing Guide](./src/docs/PUBLISH.md)
