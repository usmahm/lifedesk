"use server";

import { DEV_USER_ID } from "@lifedesk/api";
import { signInInput, signUpInput } from "@lifedesk/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "./session";

/**
 * Phase 1 auth actions.
 *
 * The forms, validation, and error surfaces are real — only the credential
 * check is stubbed. Phase 2 replaces the bodies with Better Auth calls and
 * leaves the screens untouched.
 */

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type AuthFormState = { error: string | null };

async function startSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, DEV_USER_ID, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function signIn(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInInput.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  // Phase 2: verify the credentials. Any email works for now.
  await startSession();
  redirect("/today");
}

export async function signUp(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpInput.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  await startSession();
  redirect("/today");
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/sign-in");
}
