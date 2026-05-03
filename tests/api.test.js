import { randomBytes, createHash } from "node:crypto";
import { strict as assert } from "node:assert";

const BASE_URL = "http://localhost:3000";
let cookies = [];

// Helper to keep session cookies between requests (like a browser)
function extractCookies(res) {
  const setCookie = res.headers.getSetCookie();
  if (setCookie.length > 0) {
    const newCookies = setCookie.map(c => c.split(';')[0]);
    newCookies.forEach(nc => {
      const key = nc.split('=')[0];
      cookies = cookies.filter(c => !c.startsWith(key + '='));
      cookies.push(nc);
    });
  }
}

async function fetchWithCookies(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (cookies.length > 0) {
    headers.set("cookie", cookies.join("; "));
  }
  const res = await fetch(url, { ...options, headers, redirect: 'manual' });
  extractCookies(res);
  return res;
}

async function runTests() {
  console.log("🚀 Starting Full OIDC API Test Suite...\n");
  
  // ---------------------------------------------------------
  // 1. WELL-KNOWN ENDPOINTS
  // ---------------------------------------------------------
  console.log("1. Testing .well-known endpoints...");
  const oidcConfigRes = await fetch(`${BASE_URL}/.well-known/openid-configuration`);
  assert.equal(oidcConfigRes.status, 200, "OIDC config should return 200");
  const oidcConfig = await oidcConfigRes.json();
  assert.ok(oidcConfig.issuer, "Issuer should be present");
  
  const jwksRes = await fetch(`${BASE_URL}/.well-known/jwks.json`);
  assert.equal(jwksRes.status, 200, "JWKS should return 200");
  const jwks = await jwksRes.json();
  assert.ok(jwks.keys.length > 0, "Should have JWKS keys");
  console.log("✅ Well-known endpoints OK");

  // User credentials
  const email = `test-${Date.now()}@example.com`;
  const password = "password123";
  const newPassword = "password456";

  // ---------------------------------------------------------
  // 2. AUTHENTICATION (Signup & Login)
  // ---------------------------------------------------------
  console.log("\n2. Testing Authentication...");
  const signupParams = new URLSearchParams();
  signupParams.append("firstName", "Test");
  signupParams.append("lastName", "User");
  signupParams.append("email", email);
  signupParams.append("password", password);
  
  let res = await fetchWithCookies(`${BASE_URL}/authorize/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: signupParams
  });
  assert.equal(res.status, 302, "Signup should redirect and set session cookie");
  console.log("✅ Signup & Session Creation OK");

  // ---------------------------------------------------------
  // 3. ACCOUNT MANAGEMENT APIs (Session Protected)
  // ---------------------------------------------------------
  console.log("\n3. Testing Management APIs...");
  res = await fetchWithCookies(`${BASE_URL}/api/me`);
  assert.equal(res.status, 200, "Get Me should be 200");
  const me = await res.json();
  assert.equal(me.email, email, "Email should match");
  console.log("✅ GET /api/me OK");

  const clientRes = await fetchWithCookies(`${BASE_URL}/api/me/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Client",
      redirectUris: ["http://localhost:8080/callback"],
      pkceRequired: true
    })
  });
  assert.equal(clientRes.status, 201, "Create client should be 201");
  const client = await clientRes.json();
  assert.ok(client.client_id, "Should return client_id");
  console.log("✅ POST /api/me/clients OK");

  // ---------------------------------------------------------
  // 4. OIDC AUTHORIZATION CODE FLOW (with PKCE)
  // ---------------------------------------------------------
  console.log("\n4. Testing OIDC Flow...");
  
  // Create PKCE Verifier and Challenge
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  const authUrl = new URL(`${BASE_URL}/authorize`);
  authUrl.searchParams.append("client_id", client.client_id);
  authUrl.searchParams.append("redirect_uri", "http://localhost:8080/callback");
  authUrl.searchParams.append("state", "xyz");
  authUrl.searchParams.append("code_challenge", codeChallenge);
  authUrl.searchParams.append("code_challenge_method", "S256");

  res = await fetchWithCookies(authUrl.toString());
  assert.equal(res.status, 302, "Authorize should redirect");
  const location = res.headers.get("location") || "";
  assert.ok(location.includes("code="), "Redirect should contain auth code");
  
  const callbackUrl = new URL(location);
  const code = callbackUrl.searchParams.get("code");
  console.log("✅ Authorization Endpoint OK");

  // Token Endpoint (Exchange Code for Tokens)
  const tokenParams = new URLSearchParams();
  tokenParams.append("grant_type", "authorization_code");
  tokenParams.append("code", code);
  tokenParams.append("redirect_uri", "http://localhost:8080/callback");
  tokenParams.append("client_id", client.client_id);
  tokenParams.append("client_secret", client.client_secret);
  tokenParams.append("code_verifier", codeVerifier);

  res = await fetchWithCookies(`${BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams
  });
  assert.equal(res.status, 200, "Token exchange should be 200");
  const tokens = await res.json();
  assert.ok(tokens.access_token && tokens.id_token, "Tokens received");
  console.log("✅ Token Endpoint OK");

  // Userinfo Endpoint (Verify Bearer Token)
  res = await fetch(`${BASE_URL}/userinfo`, {
    headers: { "Authorization": `Bearer ${tokens.access_token}` }
  });
  assert.equal(res.status, 200, "Userinfo should be 200");
  const userinfo = await res.json();
  assert.equal(userinfo.sub, me.id, "UserInfo subject should match User ID");
  console.log("✅ UserInfo Endpoint OK");

  // Introspect Endpoint
  const introParams = new URLSearchParams();
  introParams.append("token", tokens.access_token);
  introParams.append("client_id", client.client_id);
  introParams.append("client_secret", client.client_secret);
  res = await fetch(`${BASE_URL}/introspect`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: introParams
  });
  const introspect = await res.json();
  assert.ok(introspect.active, "Token should be active");
  console.log("✅ Introspect Endpoint OK");

  // Revoke Endpoint
  const revokeParams = new URLSearchParams();
  revokeParams.append("token", tokens.access_token);
  revokeParams.append("client_id", client.client_id);
  revokeParams.append("client_secret", client.client_secret);
  res = await fetch(`${BASE_URL}/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: revokeParams
  });
  assert.equal(res.status, 200, "Revoke should be 200");
  console.log("✅ Revoke Endpoint OK");

  // ---------------------------------------------------------
  // 5. SECURITY & LOGOUT
  // ---------------------------------------------------------
  console.log("\n5. Testing Security Features...");
  // Step-up Auth: Update Password
  res = await fetchWithCookies(`${BASE_URL}/api/me/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword: password, newPassword: newPassword })
  });
  assert.equal(res.status, 200, "Password update should be 200");
  console.log("✅ Step-up Auth (Password Update) OK");

  // Logout
  res = await fetchWithCookies(`${BASE_URL}/authorize/logout`, { method: "POST" });
  assert.equal(res.status, 302, "Logout should redirect");
  
  // Try accessing API after logout
  res = await fetchWithCookies(`${BASE_URL}/api/me`);
  assert.equal(res.status, 401, "API access after logout should be blocked");
  console.log("✅ Session Logout Protection OK");

  console.log("\n🎉 ALL 12 API ENDPOINTS PASSED SUCCESSFULLY! 🎉");
}

runTests().catch(err => {
  console.error("❌ Test Failed:", err.message);
  process.exit(1);
});
