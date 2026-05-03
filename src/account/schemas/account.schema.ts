import { z } from "zod";

export const UpdateEmailSchema = z.object({
  currentPassword: z.string().optional(),
  email: z.email().trim(),
}).strict();

export const UpdatePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8),
}).strict();
