import type { NextFunction, Request, Response } from "express";
import { compare, hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/db.js";
import { users } from "../../db/schema.js";
import ApiError from "../../utility/api.error.js";
import { LoginSchema, SignupSchema } from "../schemas/auth.schema.js";
import {
  clearOAuthResumeCookie,
  normalizeResumePath,
  OAUTH_RESUME_COOKIE,
} from "../../oauth/oauthResumeCookie.js";
import {
  renderLoginPage,
  renderSignupPage,
} from "../views/auth-page.service.js";

function redirectAfterAuth(req: Request, res: Response): void {
  const resume = normalizeResumePath(req.cookies[OAUTH_RESUME_COOKIE]);
  const target = resume ?? "/dashboard/";
  clearOAuthResumeCookie(res);
  res.redirect(302, target);
}

export async function loginPageGet(req: Request, res: Response): Promise<void> {
  const error =
    typeof req.query.error === "string" ? req.query.error : undefined;
  res
    .status(200)
    .type("html")
    .send(await renderLoginPage(error ? { error } : {}));
}

export async function signupPageGet(
  req: Request,
  res: Response,
): Promise<void> {
  const error =
    typeof req.query.error === "string" ? req.query.error : undefined;
  res
    .status(200)
    .type("html")
    .send(await renderSignupPage(error ? { error } : {}));
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .type("html")
        .send(
          await renderLoginPage({ error: "Invalid email or password format." }),
        );
      return;
    }
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, parsed.data.email));
    if (!user) {
      res
        .status(401)
        .type("html")
        .send(await renderLoginPage({ error: "Invalid credentials." }));
      return;
    }
    if (!user.passwordHash) {
      res
        .status(401)
        .type("html")
        .send(
          await renderLoginPage({
            error:
              "This account dont has a password attached. Please use the 'Sign in with' button below.",
          }),
        );
      return;
    }

    const ok = await compare(parsed.data.password, user.passwordHash);
    if (!ok) {
      res
        .status(401)
        .type("html")
        .send(await renderLoginPage({ error: "Invalid credentials." }));
      return;
    }

    req.session.regenerate((err) => {
      if (err) return next(ApiError.internal("Failed to start session"));
      req.session.userId = user.id;
      redirectAfterAuth(req, res);
    });
  } catch (error) {
    next(error);
  }
}

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = SignupSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .type("html")
        .send(await renderSignupPage({ error: "Please check all fields." }));
      return;
    }
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, parsed.data.email));
    if (existing) {
      res
        .status(409)
        .type("html")
        .send(await renderSignupPage({ error: "Email already in use." }));
      return;
    }

    const passwordHash = await hash(parsed.data.password, 12);
    const [user] = await db
      .insert(users)
      .values({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName ?? null,
        email: parsed.data.email,
        passwordHash,
      })
      .returning();
    if (!user) throw ApiError.internal("Failed to create user");

    req.session.regenerate((err) => {
      if (err) return next(ApiError.internal("Failed to start session"));
      req.session.userId = user.id;
      redirectAfterAuth(req, res);
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    req.session.destroy((err) => {
      if (err) return next(ApiError.internal("Failed to logout"));
      clearOAuthResumeCookie(res);
      res.redirect(302, "/authorize/login");
    });
  } catch (error) {
    next(error);
  }
}
