# General Auth Service - API Guide

This document outlines all available endpoints in the OIDC service, their purpose, and authentication requirements.

## 1. Authentication Endpoints (Browser/HTML)

These endpoints are designed to be consumed by web browsers. They handle user authentication and set the `connect.sid` session cookie.

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/authorize/login` | Renders the HTML login page. | No |
| `POST` | `/authorize/login` | Accepts `email` and `password`. Sets session cookie. | No |
| `GET` | `/authorize/signup` | Renders the HTML signup page. | No |
| `POST` | `/authorize/signup` | Accepts `firstName`, `lastName`, `email`, `password`. Creates user and sets session. | No |
| `GET` | `/authorize/google/init` | Returns JSON `{ url }` for Google SSO redirection. | No |
| `GET` | `/authorize/google/exchange` | Handles Google callback, issues JWT, and redirects to frontend. | No |
| `GET` | `/auth/success` | Helper page rendered after successful external authentication. | No |
| `POST` | `/authorize/logout` | Destroys the current user session. | **Session** |

## 2. OIDC Endpoints (Client Apps)

These endpoints implement the OpenID Connect (OIDC) specification and are used by third-party applications to authenticate users and obtain tokens.

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/.well-known/openid-configuration` | Returns the OIDC discovery document. | No |
| `GET` | `/.well-known/jwks.json` | Returns the JSON Web Key Set (public keys for verifying tokens). | No |
| `GET` | `/authorize` | Starts the authorization code flow. Expects `client_id`, `redirect_uri`, `state`, `code_challenge`. Redirects to login if no active session. | **Session** |
| `POST` | `/token` | Exchanges an authorization code for tokens. Expects `grant_type`, `code`, `redirect_uri`, `client_id`, `code_verifier`. Can also use Basic Auth (`Authorization: Basic base64(client_id:client_secret)`). | Client Credentials |
| `GET` | `/userinfo` | Returns the authenticated user's profile information. | **Bearer Token** |
| `POST` | `/introspect` | Verifies if a token is active and returns metadata. | Client Credentials |
| `POST` | `/refresh` | Obtains a new access token using a refresh token. | Client Credentials |
| `POST` | `/revoke` | Revokes an active token. | Client Credentials |

## 3. Account Management APIs (REST)

These APIs manage the user's account and registered OAuth clients. They support both **Session Cookies** (for first-party web clients) and **Bearer Tokens** (for API-driven interactions).

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/me` | Returns the current user's profile and SSO linked providers. | **Auth** (Session or Token) |
| `PATCH` | `/api/me/email` | Updates the user's email. Requires `email` and `currentPassword` in body. | **Auth** + Password |
| `PATCH` | `/api/me/password` | Updates the user's password. Requires `newPassword` and `currentPassword` in body. | **Auth** + Password |

## 4. Client Management APIs (REST)

These APIs allow users to manage their OAuth clients. 
*(Note: As discussed, using Bearer tokens for these endpoints carries a risk if the token is leaked. First-party session usage is recommended.)*

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/me/clients` | Lists all OAuth clients owned by the current user. | **Auth** (Session or Token) |
| `POST` | `/api/me/clients` | Creates a new OAuth client. Requires `name`, `redirectUris`, `pkceRequired`. Returns client secret. | **Auth** |
| `PUT` | `/api/me/clients/:clientId/redirect-uris` | Adds or removes allowed redirect URIs. Requires `urisToAdd` / `urisToRemove`. | **Auth** |
| `PATCH`| `/api/me/clients/:clientId/rotate-secret` | Generates a new client secret for the specified app. | **Auth** |
