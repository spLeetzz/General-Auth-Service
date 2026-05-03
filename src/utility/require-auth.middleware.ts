import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../keys/jwt.service.js";
import ApiError from "./api.error.js";

/**
 * Require authentication via Bearer Token or Session Cookie.
 * 
 * Bearer tokens are stateless _ the userId is derived from the JWT `sub`
 * claim and placed on `req.userId` without touching the session store.
 * Session cookies are used by the login/signup HTML flow.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    // 1. Try Bearer Token first (stateless _ no session write)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const { payload } = await verifyAccessToken(token);
        if (payload.sub) {
          (req as any).userId = payload.sub;
          return next();
        }
      } catch {
        return next(ApiError.unauthorized("Invalid or expired access token"));
      }
    }

    // 2. Fall back to Session Cookie
    if (req.session.userId) {
      (req as any).userId = req.session.userId;
      return next();
    }

    // 3. No authentication provided
    next(ApiError.unauthorized("Authentication required"));
  } catch (error) {
    next(error);
  }
}
