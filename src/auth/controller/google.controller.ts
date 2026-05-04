import type { NextFunction, Request, Response } from "express";
import { randomBytes, createHash } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/db.js";
import { users, ssoAccounts, oauthStates } from "../../db/schema.js";
import ApiError from "../../utility/api.error.js";
import { signAccessToken } from "../../keys/jwt.service.js";
import { createAuthCode } from "../../oauth/services/oauth.service.js";

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

/** GET /authorize/google/init _ generates state, saves to DB, returns Google auth URL */
export async function googleInit(
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
    const state = randomBytes(16).toString("hex");
    const resume = typeof req.query.resume === "string" ? req.query.resume : null;

    await db.insert(oauthStates).values({
      state,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
      resume,
    });

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
      prompt: "select_account",
    });

    res.json({ url: `${GOOGLE_AUTH_URL}?${params.toString()}` });
  } catch (error) {
    next(error);
  }
}

/** GET /authorize/google/exchange _ exchange code, upsert user, issue JWT */
export async function googleExchange(
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

    // Verify state from DB
    const [row] = await db
      .select()
      .from(oauthStates)
      .where(eq(oauthStates.state, state));

    if (!row || row.expiresAt < Date.now()) {
      throw ApiError.badRequest("Invalid or expired state");
    }

    // Consume state immediately
    await db.delete(oauthStates).where(eq(oauthStates.state, state));

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

    // 4. Check if we are in the middle of an OIDC login via DB state.
    // Instead of bouncing through /authorize (which relies on a session cookie
    // that may race with connect-pg-simple), issue the auth code here and
    // redirect straight back to the client redirect_uri.
    const resumePath = row.resume;
    if (resumePath && typeof resumePath === "string" && resumePath.trim().startsWith("/authorize?")) {
      const resumeUrl = new URL(resumePath, "http://localhost");
      const clientId = resumeUrl.searchParams.get("client_id");
      const redirectUri = resumeUrl.searchParams.get("redirect_uri");
      const state = resumeUrl.searchParams.get("state");
      const codeChallenge = resumeUrl.searchParams.get("code_challenge") ?? undefined;

      if (clientId && redirectUri) {
        const code = await createAuthCode({
          userId,
          clientId,
          redirectUri,
          ...(codeChallenge ? { codeChallenge } : {}),
        });

        const redirect = new URL(redirectUri);
        redirect.searchParams.set("code", code);
        if (state) redirect.searchParams.set("state", state);
        return res.redirect(302, redirect.toString());
      }
    }

    // 5. Otherwise, it's a direct dashboard login: persist session explicitly,
    // then issue a short-lived JWT and redirect to the success page.
    await new Promise<void>((resolve, reject) => {
      (req as any).session.userId = userId;
      (req as any).session.save((err: Error | null) => (err ? reject(err) : resolve()));
    });

    const token = await signAccessToken(
      { sub: userId },
      {
        issuer: "urn:auth-service",
        audience: "urn:client",
        expiresInSec: 14 * 24 * 60 * 60, // 14 days
      }
    );

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/auth/success?token=${token}`);
  } catch (error) {
    next(error);
  }
}
