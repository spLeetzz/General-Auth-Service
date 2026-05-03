#!/usr/bin/env node
/**
 * Rotate RSA access-token keypair.
 *
 * - Copies current public key → access-public.prev.pem  (so clients still
 *   verifying in-flight tokens keep working during the overlap window).
 * - Generates a fresh 2048-bit RSA keypair.
 * - Writes access-private.pem + access-public.pem.
 *
 * Usage:  npm run rotate-keys
 */

import { generateKeyPairSync } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const PRIV_PATH = "access-private.pem";
const PUB_PATH = "access-public.pem";
const PREV_PUB_PATH = "access-public.prev.pem";

// 1. Back up current public key
if (existsSync(PUB_PATH)) {
  const current = readFileSync(PUB_PATH, "utf8");
  writeFileSync(PREV_PUB_PATH, current, { mode: 0o644 });
  console.log(`✓ Saved previous public key → ${PREV_PUB_PATH}`);
} else {
  console.log("No existing public key found _ generating first keypair.");
}

// 2. Generate fresh keypair
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicExponent: 0x10001,
  privateKeyEncoding: { format: "pem", type: "pkcs8" },
  publicKeyEncoding: { format: "pem", type: "spki" },
});

writeFileSync(PRIV_PATH, privateKey, { mode: 0o600 });
writeFileSync(PUB_PATH, publicKey, { mode: 0o644 });

console.log(`✓ New keypair written → ${PRIV_PATH}, ${PUB_PATH}`);
console.log("Restart the server to pick up the new keys.");
