# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly.

**Do NOT** create a public GitHub issue for security vulnerabilities.

**Instead:**
- Email: security@screencold.com
- Discord: DM a maintainer

We appreciate your help and will respond within 48 hours.

## Security Measures

### Authentication & Authorization

- **NextAuth.js** with JWT strategy
- Session tokens with 30-day expiry
- OAuth 2.0 for Google authentication
- Passwords hashed with bcrypt (cost factor 12)

### API Security

- **Rate Limiting**: Redis-based, per-IP and per-user
- **Input Validation**: Zod schemas on all endpoints
- **CSRF Protection**: Origin header verification
- **API Keys**: SHA-256 hashed, stored securely

### SSRF Protection

Blocked IP ranges:
- `localhost` / `127.0.0.1`
- Private ranges: `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`
- AWS metadata: `169.254.169.254`
- IPv6: `::1`, `fc00::/7`, `fe80::/10`

### Data Protection

- Database encryption at rest (PostgreSQL)
- SSL/TLS in transit
- Environment variables for secrets
- No sensitive data in logs

### Security Headers

All responses include:
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `Strict-Transport-Security` (production only)

### Audit Logging

All security-relevant actions logged:
- Login/logout
- Password changes
- Plan changes
- Credit purchases
- Account deletion
- Data exports

## Security Checklist

- [x] Authentication with NextAuth.js
- [x] Password hashing with bcrypt
- [x] Rate limiting with Redis
- [x] Input validation with Zod
- [x] SSRF protection
- [x] API key security
- [x] Security headers
- [x] Audit logging
- [x] Error boundaries
- [x] Sentry error tracking

## Dependencies

We regularly update dependencies to patch security vulnerabilities:

```bash
# Check for vulnerabilities
pnpm audit

# Update dependencies
pnpm update
```

## Compliance

We aim to comply with:
- GDPR (data protection)
- SOC 2 (security controls)
- PCI DSS (payment handling - via Stripe)