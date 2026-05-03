import { z } from "zod";

export const AuthorizeQuerySchema = z.object({
  client_id: z.uuid(),
  redirect_uri: z.url(),
  state: z.string().optional(),
  code_challenge: z.string().min(43).max(128).optional(),
  code_challenge_method: z.literal("S256").optional(),
}).refine(
  (q) => {
    if (q.code_challenge && !q.code_challenge_method) return false;
    if (!q.code_challenge && q.code_challenge_method) return false;
    return true;
  },
  { message: "code_challenge and code_challenge_method must be provided together" },
);

export const TokenBodySchema = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string().min(10),
  redirect_uri: z.url(),
  code_verifier: z.string().min(43).max(128).optional(),
  client_id: z.string().uuid().optional(),
  client_secret: z.string().optional(),
});

export const RefreshBodySchema = z.object({
  grant_type: z.literal("refresh_token"),
  refresh_token: z.string().min(20),
  client_id: z.string().uuid().optional(),
  client_secret: z.string().optional(),
});

export const IntrospectBodySchema = z.object({
  token: z.string().min(20),
  client_id: z.string().uuid().optional(),
  client_secret: z.string().optional(),
});

export const RevokeBodySchema = z.object({
  token: z.string().min(20),
  client_id: z.string().uuid().optional(),
  client_secret: z.string().optional(),
});

