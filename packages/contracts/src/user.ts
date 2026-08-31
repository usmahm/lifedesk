import { z } from "zod";

import { idSchema } from "./common";

/**
 * Phase 1 shape. Better Auth owns this table from Phase 2 — keep the fields it
 * provides and nothing more, so the swap doesn't touch the client.
 */
export const userSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(120),
  email: z.email(),
  image: z.url().nullable(),
  createdAt: z.date(),
});

export type User = z.infer<typeof userSchema>;

export const signInInput = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
});

export type SignInInput = z.infer<typeof signInInput>;

export const signUpInput = signInInput.extend({
  name: z.string().min(1).max(120),
});

export type SignUpInput = z.infer<typeof signUpInput>;
