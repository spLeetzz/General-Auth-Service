import { compare } from "bcryptjs";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/db.js";
import { authCodes, clients, refreshTokens, users } from "../../db/schema.js";
import { signAccessToken, signIdToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, decodeJwtHeader } from "../../keys/jwt.service.js";
import ApiError from "../../utility/api.error.js";

const ACCESS_TTL = 60 * 10;
const ID_TTL = 60 * 10;
const REFRESH_TTL = 60 * 60 * 24 * 14;

function hashToken(v: string) {
  return createHash("sha256").update(v).digest("hex");
}

function pkceS256(v: string) {
  return createHash("sha256").update(v).digest("base64url");
}

async function verifyClient(h?: string, body?: { clientId?: string | undefined; clientSecret?: string | undefined }) {
  let cId: string;
  let cSecret: string;

  if (h && h.startsWith("Basic ")) {
    const d = Buffer.from(h.slice(6), "base64").toString("utf8");
    const i = d.indexOf(":");
    if (i <= 0) throw ApiError.unauthorized("Invalid basic auth");
    cId = d.slice(0, i);
    cSecret = d.slice(i + 1);
  } else if (body?.clientId && body?.clientSecret) {
    cId = body.clientId;
    cSecret = body.clientSecret;
  } else {
    throw ApiError.unauthorized("Missing client basic auth or body credentials");
  }

  const [c] = await db.select().from(clients).where(eq(clients.id, cId));
  if (!c || !(await compare(cSecret, c.secretHash))) {
    throw ApiError.unauthorized("Invalid client");
  }
  return c;
}

function allowRedirect(list: string[] | null, uri: string) {
  if (!(list ?? []).includes(uri)) throw ApiError.badRequest("redirect_uri not allowed");
}

export async function createAuthCode(params: { userId: string; clientId: string; redirectUri: string; codeChallenge?: string }) {
  const [c] = await db.select().from(clients).where(eq(clients.id, params.clientId));
  if (!c) throw ApiError.badRequest("Unknown client");
  allowRedirect(c.redirectUris, params.redirectUri);
  if (c.pkceRequired && !params.codeChallenge) throw ApiError.badRequest("PKCE required");

  const code = randomBytes(32).toString("base64url");
  await db.insert(authCodes).values({
    code,
    clientId: c.id,
    userId: params.userId,
    codeChallenge: params.codeChallenge ?? null,
    redirectUri: params.redirectUri,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });
  return code;
}

export async function exchangeCode(params: {
  authorizationHeader: string | undefined;
  code: string;
  redirectUri: string;
  codeVerifier: string | undefined;
  issuer: string;
  clientId?: string | undefined;
  clientSecret?: string | undefined;
}) {
  const client = await verifyClient(params.authorizationHeader, { clientId: params.clientId, clientSecret: params.clientSecret });
  const [row] = await db.select().from(authCodes).where(and(eq(authCodes.code, params.code), eq(authCodes.clientId, client.id)));
  if (!row) throw ApiError.unauthorized("Invalid code");

  await db.delete(authCodes).where(eq(authCodes.code, row.code));
  if (new Date(row.expiresAt).getTime() < Date.now()) throw ApiError.unauthorized("Code expired");
  allowRedirect(client.redirectUris, params.redirectUri);
  if (row.redirectUri && row.redirectUri !== params.redirectUri) throw ApiError.unauthorized("redirect_uri mismatch");
  if (row.codeChallenge) {
    if (!params.codeVerifier) throw ApiError.unauthorized("Missing verifier");
    if (pkceS256(params.codeVerifier) !== row.codeChallenge) throw ApiError.unauthorized("Invalid verifier");
  }

  const access_token = await signAccessToken(
    { sub: row.userId, token_use: "access", client_id: client.id },
    { issuer: params.issuer, audience: client.id, expiresInSec: ACCESS_TTL },
  );
  const id_token = await signIdToken(
    { sub: row.userId },
    { issuer: params.issuer, audience: client.id, expiresInSec: ID_TTL },
  );

  const familyId = randomUUID();
  const refresh_token = await signRefreshToken(
    { sub: row.userId, client_id: client.id, family_id: familyId },
    { issuer: params.issuer, expiresInSec: REFRESH_TTL },
  );
  await db.insert(refreshTokens).values({
    tokenHash: hashToken(refresh_token),
    familyId,
    userId: row.userId,
    clientId: client.id,
    used: false,
    expiresAt: new Date(Date.now() + REFRESH_TTL * 1000).toISOString(),
  });

  return { token_type: "Bearer", expires_in: ACCESS_TTL, access_token, refresh_token, id_token };
}

export async function refresh(params: { authorizationHeader: string | undefined; refreshToken: string; issuer: string; clientId?: string | undefined; clientSecret?: string | undefined; }) {
  const client = await verifyClient(params.authorizationHeader, { clientId: params.clientId, clientSecret: params.clientSecret });
  const verified = await verifyRefreshToken(params.refreshToken, { issuer: params.issuer });
  const claims = verified.payload;
  const hash = hashToken(params.refreshToken);
  const [row] = await db.select().from(refreshTokens).where(and(eq(refreshTokens.tokenHash, hash), eq(refreshTokens.clientId, client.id)));

  if (!row) throw ApiError.unauthorized("Invalid refresh token");
  if (new Date(row.expiresAt).getTime() < Date.now()) throw ApiError.unauthorized("Expired");

  if (row.used) {
    const now = new Date().toISOString();
    await db.update(refreshTokens).set({ used: true, expiresAt: now }).where(eq(refreshTokens.familyId, row.familyId));
    throw ApiError.unauthorized("Reuse detected");
  }

  await db.update(refreshTokens).set({ used: true }).where(eq(refreshTokens.tokenHash, row.tokenHash));
  const next = await signRefreshToken(
    { sub: claims.sub as string, client_id: client.id, family_id: row.familyId },
    { issuer: params.issuer, expiresInSec: REFRESH_TTL },
  );
  await db.insert(refreshTokens).values({
    tokenHash: hashToken(next),
    familyId: row.familyId,
    userId: row.userId,
    clientId: row.clientId,
    used: false,
    expiresAt: new Date(Date.now() + REFRESH_TTL * 1000).toISOString(),
  });

  const access_token = await signAccessToken(
    { sub: row.userId, token_use: "access", client_id: client.id },
    { issuer: params.issuer, audience: client.id, expiresInSec: ACCESS_TTL },
  );
  const id_token = await signIdToken(
    { sub: row.userId },
    { issuer: params.issuer, audience: client.id, expiresInSec: ID_TTL },
  );

  return { token_type: "Bearer", expires_in: ACCESS_TTL, access_token, refresh_token: next, id_token };
}

export async function revoke(params: { authorizationHeader: string | undefined; token: string; issuer: string; clientId?: string | undefined; clientSecret?: string | undefined; }) {
  const client = await verifyClient(params.authorizationHeader, { clientId: params.clientId, clientSecret: params.clientSecret });
  // RFC 7009: revocation endpoint SHOULD respond with 200 even if token is invalid
  try {
    await verifyRefreshToken(params.token);
    await db
      .update(refreshTokens)
      .set({ used: true, expiresAt: new Date().toISOString() })
      .where(and(eq(refreshTokens.tokenHash, hashToken(params.token)), eq(refreshTokens.clientId, client.id)));
  } catch {
    // Token is invalid, already revoked, or is an access token — silently succeed per RFC 7009
  }
}

export async function introspect(params: { authorizationHeader: string | undefined; token: string; issuer: string; clientId?: string | undefined; clientSecret?: string | undefined; }) {
  await verifyClient(params.authorizationHeader, { clientId: params.clientId, clientSecret: params.clientSecret });
  try {
    const h = decodeJwtHeader(params.token);
    if (h.typ && h.typ !== "at+jwt" && h.typ !== "JWT") return { active: false };
    const v = await verifyAccessToken(params.token, { issuer: params.issuer });
    return { active: true, sub: v.payload.sub, exp: v.payload.exp, iat: v.payload.iat, iss: v.payload.iss, aud: v.payload.aud, token_use: v.payload.token_use, kid: h.kid };
  } catch {
    // not access/id token
  }
  try {
    const v = await verifyRefreshToken(params.token, { issuer: params.issuer });
    const hash = hashToken(params.token);
    const [row] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hash));
    if (!row || row.used || new Date(row.expiresAt).getTime() < Date.now()) return { active: false };
    return { active: true, sub: v.payload.sub as string, client_id: v.payload.client_id as string, token_type: "refresh_token", exp: v.payload.exp };
  } catch {
    // not a refresh token
  }
  return { active: false };
}

export async function userInfo(params: { token: string; issuer: string }) {
  const h = decodeJwtHeader(params.token);
  if (h.typ !== "at+jwt") throw ApiError.unauthorized("Invalid token type");
  const v = await verifyAccessToken(params.token, { issuer: params.issuer });
  if (v.payload.token_use !== "access") throw ApiError.unauthorized("Not an access token");
  const sub = typeof v.payload.sub === "string" ? v.payload.sub : null;
  if (!sub) throw ApiError.unauthorized("No subject");
  const [user] = await db.select().from(users).where(eq(users.id, sub));
  if (!user) throw ApiError.notFound("User not found");
  return { sub: user.id, given_name: user.firstName, family_name: user.lastName ?? undefined, name: [user.firstName, user.lastName].filter(Boolean).join(" "), email: user.email ?? undefined };
}

