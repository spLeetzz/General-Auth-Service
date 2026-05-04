# General Auth Service

A fully featured OpenID Connect (OIDC) Authentication Service.

## Important Links

- **Dashboard:** [Admin Dashboard](https://general-auth-service-spleetzzs-projects.vercel.app) - Manage clients, accounts, and server configurations easily via the web interface.
- **API Reference:** [API Ref](./docs/API_REF.md)

## Plug-and-Play Client SDKs

If you're building an application and want to integrate with this OIDC provider, we've provided ready-to-use SDK implementations in both TypeScript and JavaScript.

You can find them in the `sdk/` directory:

- [TypeScript Client SDK](./sdk/oidc-client.ts)
- [JavaScript Client SDK](./sdk/oidc-client.js)

### Quick Start

1. Copy the relevant SDK file into your own application codebase.
2. Set up the following environment variables in your application:
   ```env
   OIDC_ISSUER_URL="http://localhost:3000"
   OIDC_CLIENT_ID="your-client-id"
   OIDC_CLIENT_SECRET="your-client-secret"
   OIDC_REDIRECT_URI="http://localhost:4000/callback"
   ```
3. Initialize the client and use it:

```javascript
const { OIDCClient } = require("./oidc-client"); // or import { OIDCClient } from './oidc-client.ts';
const crypto = require("crypto");

// The client automatically picks up the configuration from environment variables
const client = new OIDCClient();

// Generate auth URL and redirect user
app.get("/login", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  // Optional: save state in session to verify during callback
  const url = client.getAuthorizationUrl(state, ["openid", "profile", "email"]);
  res.redirect(url);
});

// Handle callback
app.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  // Optional: verify state

  try {
    const tokenData = await client.exchangeCodeForToken(code);
    const userInfo = await client.getUserInfo(tokenData.access_token);

    // Login successful
    res.json({ tokenData, userInfo });
  } catch (error) {
    res.status(500).send("Authentication failed");
  }
});
```
