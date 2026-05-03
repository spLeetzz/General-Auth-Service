import { z } from "zod";

export const CreateClientSchema = z
  .object({
    name: z
      .string({
        error: (issue) =>
          issue.input === undefined ? "Name is required" : "Invalid name",
      })
      .trim()
      .min(2, { message: "Name too short" })
      .max(100),
    redirectUris: z
      .array(z.url({ error: () => "Invalid redirect URI" }), {
        error: (issue) =>
          issue.input === undefined
            ? "Redirect URIs required"
            : "Invalid redirect URIs",
      })
      .min(1, { message: "At least one redirect URI required" }),
    pkceRequired: z.boolean().default(false),
  })
  .strict();

export const ChangeRedirectUrisSchema = z
  .object({
    urisToAdd: z
      .array(z.url({ error: () => "Invalid URI in urisToAdd" }))
      .default([]),
    urisToRemove: z
      .array(z.url({ error: () => "Invalid URI in urisToRemove" }))
      .default([]),
  })
  .strict()
  .refine((data) => data.urisToAdd.length > 0 || data.urisToRemove.length > 0, {
    message: "Provide at least one URI to add or remove",
  });
