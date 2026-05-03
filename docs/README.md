# OIDC Auth Server

## Keys

- `access-private.pem` + `access-public.pem` → RS256 access + ID tokens. JWKS publish public.
- `REFRESH_SECRET` env → HS256 refresh tokens. Server only, no publish.
- `npm run rotate-keys` → rotates keypair, saves previous public key as `access-public.prev.pem`.

## DB

PostgreSQL. Drizzle ORM. Tables: `users`, `sso_accounts`, `clients` (FK→users), `auth_codes`, `refresh_tokens`.

## Endpoints

| Path | Method | What |
|---|---|---|
| `/.well-known/openid-configuration` | GET | discovery doc |
| `/.well-known/jwks.json` | GET | public RSA key |
| `/authorize` | GET | start OAuth flow. No session → redirect `/authorize/login` |
| `/authorize/login` | GET/POST | sign in page |
| `/authorize/signup` | GET/POST | create account |
| `/authorize/logout` | POST | kill session |
| `/authorize/google` | GET | redirect to Google SSO |
| `/authorize/google/callback` | GET | Google SSO callback |
| `/token` | POST | exchange code + PKCE verifier → tokens |
| `/refresh` | POST | exchange refresh token → new tokens |
| `/introspect` | POST | check token active |
| `/revoke` | POST | kill refresh token |
| `/userinfo` | GET | user data via Bearer access token |
| `/api/me` | GET | current user info (session) |
| `/api/me/email` | PATCH | update email |
| `/api/me/password` | PATCH | update/set password |
| `/api/me/clients` | GET | list user's clients |
| `/api/me/clients` | POST | create client |
| `/api/me/clients/:id/redirect-uris` | PUT | change URIs |
| `/api/me/clients/:id/rotate-secret` | PATCH | new secret |
| `/dashboard` | GET | management UI (static HTML) |

## Flow

```
Client app                          Auth Server
    |                                   |
    |── GET /authorize?... ────────────>|  (1) no session → redirect login)
    |<──── 302 /authorize/login ───────|  (2) resume cookie set
    |                                   |
    |── GET /authorize/login ──────────>|  (3) HTML form
    |<──── 200 login.html ─────────────|
    |                                   |
    |── POST /authorize/login ─────────>|  (4) session created
    |<──── 302 /authorize?... ─────────|  (5) resume cookie cleared
    |                                   |
    |── GET /authorize?... ────────────>|  (6) now has session
    |<──── 302 redirect_uri?code=... ──|  (7) auth code issued
    |                                   |
    |── POST /token ───────────────────>|  (8) Basic auth + code + verifier
    |<──── 200 {access, id, refresh} ──|  (9) tokens issued
    |                                   |
    |── GET /userinfo ─────────────────>|  (10) Bearer access_token
    |<──── 200 {sub, name, email} ─────|
```

## Setup

```bash
# 1. env
DATABASE_URL=postgresql://user:pass@localhost/auth
SESSION_SECRET=min32charslongrandomstring
REFRESH_SECRET=hex64randomfromcryptorandombytes32
GOOGLE_CLIENT_ID=your-google-client-id          # optional
GOOGLE_CLIENT_SECRET=your-google-client-secret  # optional

# 2. generate access RSA keypair (one time)
npm run rotate-keys

# 3. DB migrate
npx drizzle-kit generate
npx drizzle-kit migrate

# 4. run
npm run dev          # dev with reload
npm start            # prod
```

## Dashboard

Static HTML pages at `/dashboard`:
- **Clients list** _ view all your OAuth clients
- **Create client** _ register a new client app, get client_id + secret
- **Account settings** _ update email, set/change password

All dashboard APIs require a session cookie (login first via `/authorize/login` or Google SSO).

## Google SSO

Zero external dependencies _ uses `fetch()` to call Google's OAuth2 endpoints directly.

Env vars needed:
- `GOOGLE_CLIENT_ID` _ from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` _ from Google Cloud Console

Authorized redirect URI in Google Console: `/authorize/google/callback`

## Refresh token = JWT + DB double check

- HS256 signed JWT with `sub`, `client_id`, `family_id`
- DB stores hash + `used` flag + expiry
- Reuse detection: JWT verifies, but DB says `used=true` → whole family revoked
- Rotation: new refresh JWT each time, old marked used

## Access token = RS256 JWT

- `kid` in header → JWKS lookup
- Clients verify via `/.well-known/jwks.json`
- No DB hit on verify
