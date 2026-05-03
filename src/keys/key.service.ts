import { readFile } from "node:fs/promises";
import { createHash, createPrivateKey, createPublicKey } from "node:crypto";
import type { KeyObject } from "node:crypto";

export type JwkRsaPublic = {
  kty: "RSA";
  n: string;
  e: string;
  use: "sig";
  alg: "RS256";
  kid: string;
};

type KeySet = {
  privateKey: KeyObject;
  publicKey: KeyObject;
  publicJwk: JwkRsaPublic;
};

let cache: KeySet | null = null;

function computeKid(n: string, e: string): string {
  return createHash("sha256").update(`${n}.${e}`).digest("base64url").slice(0, 16);
}

export async function initKeyCache(): Promise<void> {
  const [privatePem, publicPem] = await Promise.all([
    readFile("access-private.pem", "utf8"),
    readFile("access-public.pem", "utf8"),
  ]);

  const privateKey = createPrivateKey(privatePem);
  const publicKey = createPublicKey(publicPem);
  const jwk = publicKey.export({ format: "jwk" }) as { kty?: string; n?: string; e?: string };
  if (jwk.kty !== "RSA" || !jwk.n || !jwk.e) throw new Error("access-public.pem must be RSA");

  cache = {
    privateKey,
    publicKey,
    publicJwk: { kty: "RSA", n: jwk.n, e: jwk.e, use: "sig", alg: "RS256", kid: computeKid(jwk.n, jwk.e) },
  };
}

function requireCache(): KeySet {
  if (!cache) throw new Error("Key cache not initialized. Call initKeyCache() during startup.");
  return cache;
}

export function getAccessKeys(): KeySet {
  return requireCache();
}

export function getPublicJwks(): { keys: JwkRsaPublic[] } {
  return { keys: [requireCache().publicJwk] };
}
