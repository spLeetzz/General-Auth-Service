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
    secure: false,
    sameSite: "lax", // really BAD BAD BAD but i dont have a https domain now and vercel is not helpin on it
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 daysW
  },
};
