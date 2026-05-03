import { SignJWT, decodeProtectedHeader, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import { getAccessKeys } from "./key.service.js";

const refreshSecret = new TextEncoder().encode(process.env.REFRESH_SECRET!);

export async function signAccessToken(
  payload: JWTPayload,
  options: { issuer: string; audience: string; expiresInSec: number },
): Promise<string> {
  const keys = getAccessKeys();
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", typ: "at+jwt", kid: keys.publicJwk.kid })
    .setIssuedAt(now)
    .setIssuer(options.issuer)
    .setAudience(options.audience)
    .setExpirationTime(now + options.expiresInSec)
    .sign(keys.privateKey);
}

export async function signIdToken(
  payload: JWTPayload,
  options: { issuer: string; audience: string; expiresInSec: number },
): Promise<string> {
  const keys = getAccessKeys();
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: keys.publicJwk.kid })
    .setIssuedAt(now)
    .setIssuer(options.issuer)
    .setAudience(options.audience)
    .setExpirationTime(now + options.expiresInSec)
    .sign(keys.privateKey);
}

export async function signRefreshToken(
  payload: JWTPayload,
  options: { issuer: string; expiresInSec: number },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setIssuer(options.issuer)
    .setExpirationTime(now + options.expiresInSec)
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string, options?: { issuer?: string; audience?: string }) {
  const keys = getAccessKeys();
  const verifyOptions: { issuer?: string; audience?: string } = {};
  if (options?.issuer) verifyOptions.issuer = options.issuer;
  if (options?.audience) verifyOptions.audience = options.audience;
  return jwtVerify(token, keys.publicKey, verifyOptions);
}

export async function verifyRefreshToken(token: string, options?: { issuer?: string }) {
  const verifyOptions: { issuer?: string } = {};
  if (options?.issuer) verifyOptions.issuer = options.issuer;
  return jwtVerify(token, refreshSecret, verifyOptions);
}

export function decodeJwtHeader(token: string) {
  return decodeProtectedHeader(token);
}
