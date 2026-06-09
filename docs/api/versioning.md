# ScreenCold API Versioning Strategy

## Versioning Scheme

We use **URI path versioning** with optional `Accept-Version` header support.

### Current Versions

| Version | Status   | Sunset     |
|---------|----------|------------|
| v1      | Active   | —          |

### URL Format

```
GET /api/v1/audits
POST /api/v1/audits
GET /api/v1/campaigns
```

### Header-Based Versioning (Alternative)

Clients may also specify version via the `Accept-Version` header:

```
Accept-Version: v1
```

When both URI and header are present, the URI takes precedence.

### Deprecation Policy

1. A version enters **deprecation** when a newer major version is released
2. Deprecated versions return `Deprecation: true` header + `Warning` header
3. After 6 months of deprecation, the version enters **sunset**
4. Sunset versions return `Sunset: <date>` header
5. After the sunset date, the version returns `410 Gone`

### Migration

- v1 and v2 can coexist during the deprecation period
- Clients receive migration guides via `Link` header
- Breaking changes are documented in API_CHANGELOG.md
