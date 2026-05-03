import type { NextFunction, Request, Response } from "express";
import ApiError from "../../utility/api.error.js";
import {
  AuthorizeQuerySchema,
  IntrospectBodySchema,
  RefreshBodySchema,
  RevokeBodySchema,
  TokenBodySchema,
} from "../schemas/oauth.schema.js";
import * as oauthService from "../services/oauth.service.js";
import {
  clearOAuthResumeCookie,
  setOAuthResumeCookie,
} from "../oauthResumeCookie.js";
import { renderErrorPage } from "../../auth/views/auth-page.service.js";
import { z } from "zod";

function issuerFromRequest(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? req.protocol;
  const host = req.get("host");
  return `${proto}://${host}`;
}

/** Return a safe, client-facing message. Only expose ApiError messages; everything else is generic. */
function safeMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof z.ZodError) {
    return "Validation failed: " + error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
  }
  if (error instanceof Error) console.error("[oauth]", error.message);
  return fallback;
}

function oauthTokenErrorResponse(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof z.ZodError) return next(error);
  
  const msg = safeMessage(error, "request failed");
  if (msg.includes("Invalid client") || msg.includes("Missing client")) {
    return res.status(401).json({ error: "invalid_client", error_description: msg });
  }
  if (
    msg.includes("authorization code") ||
    msg.includes("PKCE") ||
    msg.includes("refresh token") ||
    msg.includes("redirect_uri mismatch")
  ) {
    return res.status(400).json({ error: "invalid_grant", error_description: msg });
  }
  return res.status(400).json({ error: "invalid_request", error_description: msg });
}

export async function authorize(req: Request, res: Response, next: NextFunction) {
  try {
    const q = AuthorizeQuerySchema.parse(req.query);
    const userId = req.session.userId;
    if (!userId) {
      const params = new URLSearchParams({
        client_id: q.client_id,
        redirect_uri: q.redirect_uri,
      });
      if (q.code_challenge) params.set("code_challenge", q.code_challenge);
      if (q.code_challenge_method) params.set("code_challenge_method", q.code_challenge_method);
      if (q.state) params.set("state", q.state);
      const resume = `/authorize?${params.toString()}`;
      setOAuthResumeCookie(res, resume);
      return res.redirect(302, "/authorize/login");
    }

    const code = await oauthService.createAuthCode({
      userId,
      clientId: q.client_id,
      redirectUri: q.redirect_uri,
      ...(q.code_challenge ? { codeChallenge: q.code_challenge } : {}),
    });

    clearOAuthResumeCookie(res);
    const redirect = new URL(q.redirect_uri);
    redirect.searchParams.set("code", code);
    if (q.state) redirect.searchParams.set("state", q.state);
    res.redirect(302, redirect.toString());
  } catch (error) {
    const statusCode = error instanceof ApiError ? error.statusCode : 400;
    const errorName = error instanceof z.ZodError ? "invalid_request" : "server_error";
    const errorMessage = error instanceof z.ZodError 
      ? error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ")
      : (error instanceof ApiError ? error.message : "Internal server error");

    const html = await renderErrorPage({
      statusCode,
      statusText: statusCode === 400 ? 'Bad Request' : 'Error',
      errorName,
      errorMessage,
    });

    res.status(statusCode).type("html").send(html);
  }
}

export async function token(req: Request, res: Response, next: NextFunction) {
  try {
    const body = TokenBodySchema.parse(req.body);
    const tokenResponse = await oauthService.exchangeCode({
      authorizationHeader: req.headers.authorization,
      code: body.code,
      redirectUri: body.redirect_uri,
      codeVerifier: body.code_verifier ?? undefined,
      issuer: issuerFromRequest(req),
      clientId: body.client_id,
      clientSecret: body.client_secret,
    });
    res.status(200).json(tokenResponse);
  } catch (error) {
    oauthTokenErrorResponse(error, res, next);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const body = RefreshBodySchema.parse(req.body);
    const tokenResponse = await oauthService.refresh({
      authorizationHeader: req.headers.authorization,
      refreshToken: body.refresh_token,
      issuer: issuerFromRequest(req),
      clientId: body.client_id,
      clientSecret: body.client_secret,
    });
    res.status(200).json(tokenResponse);
  } catch (error) {
    oauthTokenErrorResponse(error, res, next);
  }
}

export async function introspect(req: Request, res: Response, next: NextFunction) {
  try {
    const body = IntrospectBodySchema.parse(req.body);
    const response = await oauthService.introspect({
      authorizationHeader: req.headers.authorization,
      token: body.token,
      issuer: issuerFromRequest(req),
      clientId: body.client_id,
      clientSecret: body.client_secret,
    });
    res.status(200).json(response);
  } catch (error) {
    oauthTokenErrorResponse(error, res, next);
  }
}

export async function revoke(req: Request, res: Response, next: NextFunction) {
  try {
    const body = RevokeBodySchema.parse(req.body);
    await oauthService.revoke({
      authorizationHeader: req.headers.authorization,
      token: body.token,
      issuer: issuerFromRequest(req),
      clientId: body.client_id,
      clientSecret: body.client_secret,
    });
    res.status(200).json({ revoked: true });
  } catch (error) {
    oauthTokenErrorResponse(error, res, next);
  }
}

export async function userinfo(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      res.status(401).json({ error: "invalid_token", error_description: "Missing bearer token" });
      return;
    }
    const tokenHeader = auth.slice("Bearer ".length);
    const info = await oauthService.userInfo({
      token: tokenHeader,
      issuer: issuerFromRequest(req),
    });
    res.status(200).json(info);
  } catch (error) {
    oauthTokenErrorResponse(error, res, next);
  }
}

