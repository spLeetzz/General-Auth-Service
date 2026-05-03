import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().default(3000),
  SESSION_SECRET: z.string().min(10),
  SESSION_SAMESITE: z.enum(["lax", "none", "strict"]).optional(),
  REFRESH_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["dev", "production", "test"]).default("dev"),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
});

envSchema.parse(process.env);
