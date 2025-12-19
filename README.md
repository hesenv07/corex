# Servios

> Production-ready HTTP client with automatic token refresh, decorators, and zero boilerplate

[![npm version](https://img.shields.io/npm/v/servios.svg)](https://www.npmjs.com/package/servios)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**Servios** is a lightweight, type-safe HTTP client that eliminates API boilerplate. Configure once, use everywhere with automatic token management and elegant decorator syntax.

---

## ✨ Why Servios?

- 🎯 **Zero boilerplate** - Configure once globally, use in all services
- 🔄 **Auto token refresh** - 401 errors? Handled automatically with request queuing
- 🎭 **Decorator magic** - `@Public()` for unauthenticated endpoints
- 🌐 **Smart URLs** - Auto-generates `{baseURL}/{serviceName}/{version}/{endpoint}`
- 🔐 **Flexible storage** - Cookie, localStorage, or sessionStorage for tokens
- ⚡ **TypeScript first** - Full type safety with excellent IDE support
- 🧪 **Mock-ready** - Built-in mock adapter for testing

---

## 📦 Installation

```bash
npm install servios
# or
yarn add servios
```

---

## 🚀 Quick Start

### Step 1: Configure Once (Global Setup) (React)

**For Next.js you do not need this**

***go to step 2b***

Create a config file and set up Servios **once** for your entire app:

```typescript
// src/config/api.ts
import { configureBaseService } from 'servios';

configureBaseService({
  baseURL: 'https://api.example.com',

  // Automatic token refresh on 401
  async refreshToken() {
    const response = await fetch('/auth/refresh', {
      credentials: 'include'
    });
    const data = await response.json();
    return { accessToken: data.accessToken };
  },

  // Logout handler (called when refresh fails)
  logout: () => {
    window.location.href = '/login';
  },
});
```

That's it! Now all services share this configuration.

---

### Step 2a: Create Services (React Setup)

Extend `ApiService` to create your API services. Each service automatically inherits the global configuration.

```typescript
// src/services/UserService.ts
import { ApiService } from 'servios';

class UserService extends ApiService {
  constructor() {
    super({
      serviceName: 'users',
      version: 'v2',  // default: 'v1'
    });
  }

  // Authenticated endpoint - token automatically added
  getMe() {
    return this.get({ endpoint: 'me' });
    // GET https://api.example.com/users/v2/me
  }

  updateProfile(data: any) {
    return this.patch({ endpoint: 'profile', data });
    // PATCH https://api.example.com/users/v2/profile
  }
}

export default new UserService();
```

---

### Step 2b: Create Services (Next.js Setup)

Extend `BaseService` to create your API services. Each service automatically inherits the global configuration.

```typescript
// src/services/api.ts
import { BaseService } from "servios";

export class JsonService extends BaseService {
    constructor() {
        super({
            baseURL: "https://jsonplaceholder.typicode.com/",
            isPublic: true,
            getAccessToken: () => "",
            setAccessToken: () => "",
            getRefreshToken: () => "",
            setRefreshToken: () => "",
        });
    }
}

// src/services/Posts.ts
import { JsonService } from './api';

export class PostService extends JsonService {
    getPost() {
        return this.api.get("/posts")
    }
}

// page.tsx
import { PostService } from "./services/userService";

const postService = new PostService();

async function Home() {
  const data = await postService.getPost();
  return <p>{data?.data?.[0]?.title}</p>;
}

export default Home;

```

---

### Step 3: Use in Components

```typescript
import userService from '@/services/UserService';

async function loadProfile() {
  try {
    const { user } = await userService.getMe();
    console.log(user);
  } catch (error) {
    console.error('Failed to load profile:', error);
  }
}
```

---

## 🎯 Core Concepts

### `configureBaseService` - Global Configuration

Call **once** at app startup. All services inherit these settings.

```typescript
configureBaseService({
  // Required
  baseURL: 'https://api.example.com',

  // Optional - Token refresh (highly recommended)
  async refreshToken() {
    const res = await fetch('/auth/refresh', { credentials: 'include' });
    return await res.json();
  },

  // Optional - Logout handler
  logout: () => router.push('/login'),

  // Optional - Token storage (default: cookie)
  tokenConfig: {
    storage: 'cookie',  // 'cookie' | 'localStorage' | 'sessionStorage'
  },

  // Optional - Retry on status codes
  retryOnStatusCodes: [401],  // default

  // Optional - Error transform
  transformError: (error) => ({
    message: error.response?.data?.message || 'Something went wrong',
  }),
});
```

---

### `ApiService` vs `BaseService`

| Class | When to use | Configuration |
|-------|------------|---------------|
| **`ApiService`** | ✅ **Use this** for app services | Inherits global config + service-specific options |
| **`BaseService`** | ⚠️ **Rare cases only** | Must provide ALL configuration manually |

**Example: Using ApiService (Recommended)**

```typescript
// Global config already has baseURL, refreshToken, etc.
class UserService extends ApiService {
  constructor() {
    super({ serviceName: 'users' });  // Only service-specific config
  }
}
```

**Example: Using BaseService (Only if needed)**

```typescript
// Use when you need a completely different configuration
class ExternalApiService extends BaseService {
  constructor() {
    super({
      baseURL: 'https://external-api.com',  // Different API
      serviceName: 'external',
      // Must provide ALL configuration here
      getAccessToken: () => localStorage.getItem('externalToken'),
      // ... all other options
    });
  }
}
```

---

## 🔓 Public Endpoints (No Authentication)

Servios provides **three ways** to mark endpoints as public (no token sent).

### 1. Class-Level Decorator ⭐ **Best for fully public services**

Mark the entire service as public - all methods skip authentication:

```typescript
import { ApiService, Public } from 'servios';

@Public()
class PublicOrgService extends ApiService {
  constructor() {
    super({ serviceName: 'org' });
  }

  // All methods are automatically public
  getOrgs() {
    return this.get({ endpoint: 'list' });
  }

  getOrgById(id: string) {
    return this.get({ endpoint: `${id}` });
  }
}

export default new PublicOrgService();
```

---

### 2. Method-Level Decorator ⭐ **Best for mixed services**

Some methods public, others authenticated:

```typescript
import { ApiService, Public } from 'servios';

class OrgService extends ApiService {
  constructor() {
    super({ serviceName: 'org' });
  }

  // Public - no token sent
  @Public()
  getPublicOrgs() {
    return this.get({ endpoint: 'public/list' });
  }

  @Public()
  getPublicOrgById(id: string) {
    return this.get({ endpoint: `public/${id}` });
  }

  // Authenticated - token automatically sent
  createOrg(data: any) {
    return this.post({ endpoint: 'create', data });
  }

  updateOrg(id: string, data: any) {
    return this.put({ endpoint: `${id}`, data });
  }
}

export default new OrgService();
```

**Note:** To use decorators, enable `experimentalDecorators` in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

---

### 3. Per-Request Flag (Alternative)

```typescript
class OrgService extends ApiService {
  getPublicOrgs() {
    return this.get({
      endpoint: 'list',
      isPublic: true,  // Skip auth for this request
    });
  }
}
```

---

### 4. Service-Level Flag (Constructor)

```typescript
class PublicApiService extends ApiService {
  constructor() {
    super({
      serviceName: 'public',
      isPublic: true,  // All requests skip authentication
    });
  }
}
```

---

## 🔒 Private Decorator (Override Public)

The `@Private()` decorator allows you to mark specific methods as **authenticated** even when the entire class is marked as `@Public()`.

### Use Case: Mostly Public Service with Few Protected Methods

```typescript
import { ApiService, Public, Private } from 'servios';

@Public()  // Class is public by default
class PostsService extends ApiService {
  constructor() {
    super({ serviceName: 'posts' });
  }

  // ✅ Public - inherits from class decorator
  getAllPosts() {
    return this.get({ endpoint: 'list' });
  }

  // ✅ Public - inherits from class decorator
  getPostById(id: string) {
    return this.get({ endpoint: `${id}` });
  }

  // 🔐 Authenticated - @Private overrides class-level @Public
  @Private()
  getMyDrafts() {
    return this.get({ endpoint: 'drafts' });
  }

  // Authenticated - @Private overrides class-level @Public
  @Private()
  createPost(data: any) {
    return this.post({ endpoint: 'create', data });
  }
}

export default new PostsService();
```

### Priority Order

Decorators follow this priority:

1. **`@Private()` (Highest)** - Always requires authentication
2. **`@Public()` method-level** - Skips authentication
3. **`@Public()` class-level** - All methods skip auth (unless overridden)
4. **Default** - Requires authentication

```typescript
@Public()
class ExampleService extends ApiService {
  // Public (class-level)
  method1() { }

  // Public (method-level override)
  @Public()
  method2() { }

  // Private (method-level override)
  @Private()
  method3() { }  // ← Token will be sent!
}
```

---

## ⚙️ Framework Setup for Decorators

### React (Vite)

**1. Install plugin:**
```bash
npm install --save-dev @babel/plugin-proposal-decorators
```

**2. Enable in `jsconfig.json` or `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

**3. Configure `vite.config.js`:**
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['@babel/plugin-proposal-decorators', { legacy: true }]
        ]
      }
    })
  ],
});
```

**4. Restart dev server:**
```bash
npm run dev
```

---

### Next.js

**1. Install plugin:**
```bash
npm install --save-dev @babel/plugin-proposal-decorators
```

**2. Enable in `tsconfig.json` or `jsconfig.json`:**
```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

**3. Option A - Using Babel (Recommended):**

Create `.babelrc` in project root:
```json
{
  "presets": ["next/babel"],
  "plugins": [
    ["@babel/plugin-proposal-decorators", { "legacy": true }]
  ]
}
```

**3. Option B - Using SWC:**

Update `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    swcPlugins: [
      ['@swc/plugin-decorators', { legacy: true }]
    ]
  }
}

module.exports = nextConfig;
```

**4. Restart Next.js:**
```bash
npm run dev
```

---

### TypeScript (Node.js)

Enable in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

---

## 📖 API Reference

### HTTP Methods

All services have these methods:

```typescript
class YourService extends ApiService {
  // GET request
  getUsers() {
    return this.get({ endpoint: 'list', params: { page: 1 } });
  }

  // POST request
  createUser(data: any) {
    return this.post({ endpoint: 'create', data });
  }

  // PUT request (replace)
  replaceUser(id: string, data: any) {
    return this.put({ endpoint: id, data });
  }

  // PATCH request (update)
  updateUser(id: string, data: any) {
    return this.patch({ endpoint: id, data });
  }

  // DELETE request
  deleteUser(id: string) {
    return this.delete({ endpoint: id });
  }
}
```

---

### Request Configuration

```typescript
interface RequestConfig {
  endpoint: string;                  // Required - API endpoint
  params?: Record<string, any>;      // Query parameters
  data?: any;                        // Request body (POST/PUT/PATCH)
  version?: string;                  // Override service version
  isPublic?: boolean;                // Skip authentication
  includeHeaders?: boolean;          // Return headers in response

  // Mock options
  isMock?: boolean;                  // Use mock for this request
  mockData?: T;                      // Mock response data
  mockStatus?: number;               // Mock status code (default: 200)

  // Raw axios config
  config?: AxiosRequestConfig;
}
```

**Example:**

```typescript
// With query parameters
await service.get({
  endpoint: 'search',
  params: { q: 'servios', limit: 10 }
});
// GET /users/v1/search?q=servios&limit=10

// With custom version
await service.post({
  endpoint: 'create',
  version: 'v3',
  data: { name: 'John' }
});
// POST /users/v3/create

// Include response headers
const response = await service.get({
  endpoint: 'me',
  includeHeaders: true
});
console.log(response.headers['x-rate-limit']);
```

---

## 🔐 Token Management

### Automatic Token Handling

Servios automatically:
1. Adds `Authorization: Bearer {token}` to requests
2. Refreshes token on 401 errors
3. Queues failed requests and retries after refresh
4. Calls `logout()` if refresh fails

### Manual Token Management

```typescript
import {
  setToken,
  getToken,
  removeToken,
  setRefreshToken,
  getRefreshToken,
  removeRefreshToken,
} from 'servios';

// Access token
setToken('eyJhbGc...');
const token = getToken();
removeToken();

// Refresh token
setRefreshToken('refresh_xyz...');
const refresh = getRefreshToken();
removeRefreshToken();
```

### Custom Token Storage

```typescript
import { configureToken } from 'servios';

configureToken({
  storage: 'cookie',  // or 'localStorage' or 'sessionStorage'
  tokenKey: 'accessToken',  // default

  cookieOptions: {
    path: '/',
    secure: true,
    expires: 7,  // days
    sameSite: 'Strict',
  },

  // Separate storage for refresh token
  refreshToken: {
    tokenKey: 'refreshToken',
    storage: 'cookie',
    cookieOptions: {
      expires: 30,  // days
    },
  },
});
```

---

## 🎭 Mock Support

### Global Mock (Development)

```typescript
class UserService extends ApiService {
  constructor() {
    super({
      serviceName: 'users',
      useMock: import.meta.env.DEV,  // Mock in development
      mockDelay: 1500,  // Simulate network delay
    });
  }

  getUsers() {
    return this.get({
      endpoint: 'list',
      mockData: {
        users: [
          { id: '1', name: 'John Doe' },
          { id: '2', name: 'Jane Smith' },
        ],
      },
    });
  }
}
```

### Per-Request Mock

```typescript
getUser(id: string) {
  return this.get({
    endpoint: id,
    isMock: true,
    mockData: { user: { id, name: 'Test User' } },
    mockStatus: 200,
  });
}
```

---

## 📝 TypeScript Support

Full type safety with generics:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

interface UserResponse {
  user: User;
}

class UserService extends ApiService {
  async getUser(id: string): Promise<UserResponse> {
    return this.get<UserResponse>({ endpoint: id });
  }
}

// Usage with full type inference
const { user } = await userService.getUser('123');
console.log(user.name);  // ✅ TypeScript knows this is a string
```

---

## 🛠️ Advanced Features

### Custom Error Transform

```typescript
configureBaseService({
  baseURL: 'https://api.example.com',

  transformError: (error) => {
    // Custom error structure
    return {
      success: false,
      message: error.response?.data?.message || 'Network error',
      status: error.response?.status,
      code: error.response?.data?.code,
    };
  },
});
```

### Custom Retry Status Codes

```typescript
configureBaseService({
  baseURL: 'https://api.example.com',
  retryOnStatusCodes: [401, 403, 503],  // Retry on these codes
});
```

### Access Axios Instance

```typescript
class CustomService extends ApiService {
  constructor() {
    super({ serviceName: 'custom' });

    // Add custom interceptor
    const axios = this.getAxiosInstance();
    axios.interceptors.request.use((config) => {
      config.headers['X-Custom-Header'] = 'value';
      return config;
    });
  }
}
```

---

## 📚 Complete Example

```typescript
// config/api.ts - Global setup
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

  transformError: (err) => ({
    message: err.response?.data?.message || 'Error',
  }),
});
```

```typescript
// services/UserService.ts
import { ApiService, Public } from 'servios';

interface User {
  id: string;
  name: string;
  email: string;
}

class UserService extends ApiService {
  constructor() {
    super({ serviceName: 'users', version: 'v2' });
  }

  @Public()
  async getPublicUsers(): Promise<{ users: User[] }> {
    return this.get({ endpoint: 'public/list' });
  }

  async getMe(): Promise<{ user: User }> {
    return this.get({ endpoint: 'me' });
  }

  async updateProfile(data: Partial<User>): Promise<{ user: User }> {
    return this.patch({ endpoint: 'profile', data });
  }
}

export default new UserService();
```

```typescript
// services/OrgService.ts
import { ApiService, Public } from 'servios';

@Public()
class OrgService extends ApiService {
  constructor() {
    super({ serviceName: 'org' });
  }

  getOrgs() {
    return this.get({ endpoint: 'list' });
  }

  getOrgById(id: string) {
    return this.get({ endpoint: `${id}` });
  }
}

export default new OrgService();
```

```typescript
// components/Profile.tsx
import userService from '@/services/UserService';
import orgService from '@/services/OrgService';

async function loadData() {
  try {
    // Authenticated request
    const { user } = await userService.getMe();

    // Public request
    const { orgs } = await orgService.getOrgs();

    console.log(user, orgs);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

---

## 🎯 Best Practices

### 1. One Global Configuration

```typescript
// ✅ Good - Configure once
configureBaseService({ baseURL: 'https://api.example.com' });

// ❌ Bad - Don't configure multiple times
```

### 2. Use ApiService for App Services

```typescript
// ✅ Good - Inherits global config
class UserService extends ApiService {
  constructor() {
    super({ serviceName: 'users' });
  }
}

// ❌ Bad - Manual config everywhere
class UserService extends BaseService {
  constructor() {
    super({
      baseURL: 'https://api.example.com',
      getAccessToken: () => localStorage.getItem('token'),
      // ... repeat for every service
    });
  }
}
```

### 3. Use Decorators for Public Endpoints

```typescript
// ✅ Good - Clean and declarative
@Public()
class PublicService extends ApiService { }

class MixedService extends ApiService {
  @Public()
  getPublicData() { }
}

// ❌ Okay - More verbose
class Service extends ApiService {
  getPublicData() {
    return this.get({ endpoint: 'data', isPublic: true });
  }
}
```

### 4. Export Service Instances

```typescript
// ✅ Good - Single instance
export default new UserService();

// ❌ Bad - Export class
export class UserService extends ApiService { }
```

### 5. Type Your Responses

```typescript
// ✅ Good - Type-safe
async getUser(id: string): Promise<{ user: User }> {
  return this.get<{ user: User }>({ endpoint: id });
}

// ❌ Bad - No types
async getUser(id: string) {
  return this.get({ endpoint: id });
}
```

---

## 🔗 Links

- [GitHub](https://github.com/hesenv07/servios)
- [npm](https://www.npmjs.com/package/servios)
- [Issues](https://github.com/hesenv07/servios/issues)
- [Changelog](./CHANGELOG.md)

---

## 📄 License

MIT © [Arif Hasanov](https://github.com/hesenv07)

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).
