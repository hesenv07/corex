# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-12

### Added

- Added `useCustomQuery` hook for seamless React Query integration
  - Returns query result along with a `QueryCacheManager` instance
  - Supports paginated, array, and single-item data
  - Fully typed with TypeScript
  - Allows optimistic cache updates via manager methods (`create`, `update`, `delete`, `replace`)

## [1.0.3] - 2025-12-11

### Changed

- Updated documentation for clarity
- Improved README structure and examples

## [1.0.2] - 2025-12-11

### Fixed

- Fixed TypeScript type definitions
- Improved token storage type safety

## [1.0.1] - 2025-12-11

### Fixed

- Token configuration defaults
- Build output optimization

## [1.0.0] - 2025-12-01

### Added

- Core HTTP client with `ApiService` and `BaseService` classes
- Zero-config service setup - only `baseURL` required
- Automatic token refresh on 401 errors
- Token management with separate access/refresh token support
- Multiple storage options: cookie, localStorage, sessionStorage
- Mock adapter support for development/testing
- Smart URL building: `{baseURL}/{serviceName}/{version}/{endpoint}`
- Customizable retry status codes
- Custom error transformation
- `QueryCacheManager` for React Query integration
  - Optimistic cache updates
  - Multiple query keys support
  - CRUD operations (create, update, delete, replace)
  - Support for paginated, array, and single item data
- Full TypeScript support with type definitions
- HTTP methods: GET, POST, PUT, PATCH, DELETE
- Request configuration options (params, data, version override, mock data)
- Token configuration with cookie options
- Axios instance access for custom interceptors

### Documentation

- Comprehensive README with examples
- API reference documentation
- Publishing guide
- Contributing guidelines

---

**Legend:**

- `Added` - New features
- `Changed` - Changes to existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security fixes
