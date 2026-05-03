import { z } from "zod";

export const LoginSchema = z
  .object({
    email: z.email().trim(),
    password: z.string().min(8),
  })
  .strict();

export const SignupSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100).optional(),
    email: z.email().trim(),
    password: z.string().min(8),
  })
  .strict();

