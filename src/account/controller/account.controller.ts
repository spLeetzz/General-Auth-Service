import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { compare, hash } from "bcryptjs";
import { db } from "../../db/db.js";
import { users, clients, ssoAccounts } from "../../db/schema.js";
import ApiError from "../../utility/api.error.js";
import { UpdateEmailSchema, UpdatePasswordSchema } from "../schemas/account.schema.js";

/** Helper: get the authenticated user's ID set by requireAuth */
function getUserId(req: Request): string {
  const id = (req as any).userId as string | undefined;
  if (!id) throw ApiError.unauthorized("Authentication required");
  return id;
}

/** GET /api/me */
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw ApiError.notFound("User not found");

    // check if user has any SSO accounts
    const ssoRows = await db.select({ provider: ssoAccounts.provider }).from(ssoAccounts).where(eq(ssoAccounts.userId, user.id));

    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      hasPassword: !!user.passwordHash,
      ssoProviders: ssoRows.map((r) => r.provider),
    });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/me/email */
export async function updateEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const { email, currentPassword } = UpdateEmailSchema.parse(req.body);

    const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId));
    if (!user) throw ApiError.notFound("User not found");

    if (user.passwordHash) {
      if (!currentPassword) throw ApiError.unauthorized("Current password is required to change email");
      const ok = await compare(currentPassword, user.passwordHash);
      if (!ok) throw ApiError.unauthorized("Current password is incorrect");
    }

    // check uniqueness
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing && existing.id !== userId) {
      throw ApiError.conflict("Email already in use");
    }

    await db.update(users).set({ email, updatedAt: new Date().toISOString() }).where(eq(users.id, userId));
    res.json({ ok: true, email });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/me/password */
export async function updatePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const { currentPassword, newPassword } = UpdatePasswordSchema.parse(req.body);

    const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId));
    if (!user) throw ApiError.notFound("User not found");

    if (user.passwordHash) {
      // has existing password → must verify current
      if (!currentPassword) throw ApiError.unauthorized("Current password is required");
      const ok = await compare(currentPassword, user.passwordHash);
      if (!ok) throw ApiError.unauthorized("Current password is incorrect");
    }
    // if no password (SSO-only), allow setting one without checking current

    const passwordHash = await hash(newPassword, 12);
    await db.update(users).set({ passwordHash, updatedAt: new Date().toISOString() }).where(eq(users.id, userId));
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

/** GET /api/me/clients */
export async function getMyClients(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const rows = await db
      .select({
        id: clients.id,
        name: clients.name,
        redirectUris: clients.redirectUris,
        pkceRequired: clients.pkceRequired,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .where(eq(clients.ownerId, userId));
    res.json(rows);
  } catch (error) {
    next(error);
  }
}
