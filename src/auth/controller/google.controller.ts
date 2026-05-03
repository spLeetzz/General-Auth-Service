import type { NextFunction, Request, Response } from "express";
import { randomBytes, createHash } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/db.js";
import { users, ssoAccounts } from "../../db/schema.js";
import ApiError from "../../utility/api.error.js";
import {
  clearOAuthResumeCookie,
  normalizeResumePath,
  OAUTH_RESUME_COOKIE,
} from "../../oauth/oauthResumeCookie.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function getGoogleConfig(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;

  return { clientId, clientSecret, redirectUri };
}

function redirectAfterAuth(req: Request, res: Response): void {
  const resume = normalizeResumePath(req.cookies[OAUTH_RESUME_COOKIE]);
  const target = resume ?? "/dashboard/";
  clearOAuthResumeCookie(res);
  res.redirect(302, target);
}

/** GET /authorize/google _ redirect user to Google consent screen */
export async function googleRedirect(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const config = getGoogleConfig(req);
    if (!config) {
      res.redirect(302, "/authorize/login?error=Google+SSO+is+not+configured");
      return;
    }

    // Store a state param in session to prevent CSRF
    const state = randomBytes(16).toString("hex");
    req.session.googleState = state;

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
      prompt: "select_account",
    });
    console.log("redirect_uri being sent:", config.redirectUri, config);

    res.redirect(302, `${GOOGLE_AUTH_URL}?${params.toString()}`);
  } catch (error) {
    next(error);
  }
}

/** GET /authorize/google/callback _ exchange code, upsert user, create session */
export async function googleCallback(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const code = req.query.code;
    const state = req.query.state;
    if (typeof code !== "string" || typeof state !== "string") {
      throw ApiError.badRequest("Missing code or state");
    }
    if (state !== req.session.googleState) {
      throw ApiError.badRequest("Invalid state parameter");
    }
    delete req.session.googleState;

    const config = getGoogleConfig(req);
    if (!config) {
      res.redirect(302, "/authorize/login?error=Google+SSO+is+not+configured");
      return;
    }

    // 1. Exchange code for tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw ApiError.internal("Google token exchange failed");
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token)
      throw ApiError.internal("No access token from Google");

    // 2. Fetch user profile
    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileRes.ok)
      throw ApiError.internal("Google userinfo request failed");
    const profile = (await profileRes.json()) as {
      sub?: string;
      email?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };
    if (!profile.sub || !profile.email)
      throw ApiError.internal("Incomplete profile from Google");

    // 3. Upsert: check if SSO account exists
    const [existing] = await db
      .select()
      .from(ssoAccounts)
      .where(
        and(
          eq(ssoAccounts.provider, "google"),
          eq(ssoAccounts.providerId, profile.sub),
        ),
      );

    let userId: string;

    if (existing) {
      // Existing SSO link _ just use it
      userId = existing.userId;
    } else {
      // Check if a local user with this email exists
      const [emailUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, profile.email));

      if (emailUser) {
        // Link Google to existing account
        userId = emailUser.id;
        await db.insert(ssoAccounts).values({
          userId,
          provider: "google",
          providerId: profile.sub,
        });
        // Fill in avatar if missing
        if (!emailUser.avatarUrl && profile.picture) {
          await db
            .update(users)
            .set({ avatarUrl: profile.picture })
            .where(eq(users.id, userId));
        }
      } else {
        // Create a new user + SSO link
        const [newUser] = await db
          .insert(users)
          .values({
            firstName: profile.given_name ?? "User",
            lastName: profile.family_name ?? null,
            email: profile.email,
            avatarUrl: profile.picture ?? null,
          })
          .returning();
        if (!newUser) throw ApiError.internal("Failed to create user");
        userId = newUser.id;
        await db.insert(ssoAccounts).values({
          userId,
          provider: "google",
          providerId: profile.sub,
        });
      }
    }

    // 4. Create session
    req.session.regenerate((err) => {
      if (err) return next(ApiError.internal("Failed to start session"));
      req.session.userId = userId;
      redirectAfterAuth(req, res);
    });
  } catch (error) {
    next(error);
  }
}
