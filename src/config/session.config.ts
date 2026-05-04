import session from "express-session";
import pgSession from "connect-pg-simple";
import { pool } from "../db/db.js";
import type { SessionOptions } from "express-session";

const PgStore = pgSession(session);

export const sessionOptions: SessionOptions = {
  store: new PgStore({
    pool,
    tableName: "session",
  }),
  secret: process.env.SESSION_SECRET as string,
  resave: false,
  saveUninitialized: false,
  rolling: true, // Auto-refresh the 14-day expiry on user activity
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Use SESSION_SAMESITE=none for cross-site OAuth iframe/popup cases.
    sameSite:
      (process.env.SESSION_SAMESITE as "lax" | "none" | "strict" | undefined) ?? "none",
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 daysW
  },
};