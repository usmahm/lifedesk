"use server";

import { signInInput, signUpInput } from "@lifedesk/contracts";
import { APIError } from "better-auth/api";
import { redirect } from "next/navigation";

import { auth } from "./server";

/**
 * Sign in, sign up, sign out.
 *
 * Better Auth writes the session cookie from inside these calls, via the
 * `nextCookies()` plugin composed in `./server`. Without that the call would
 * succeed and the cookie would never reach the browser.
 *
 * Errors are deliberately not passed through verbatim. "No user found with
 * this email" tells an attacker which addresses are registered, so both
 * failures read the same. Everything that is not an APIError rethrows, because
 * a database being down should surface as an error, not as bad credentials.
 */

export type AuthFormState = { error: string | null };

const CREDENTIALS_REJECTED = "Email or password is incorrect.";

export async function signIn(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInInput.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  try {
    await auth.api.signInEmail({ body: parsed.data });
  } catch (error) {
    if (error instanceof APIError) return { error: CREDENTIALS_REJECTED };
    throw error;
  }

  redirect("/today");
}

export async function signUp(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signUpInput.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  try {
    await auth.api.signUpEmail({ body: parsed.data });
  } catch (error) {
    if (error instanceof APIError) {
      // The one case worth naming: it is the user's own address, so saying so
      // leaks nothing they don't already know, and "incorrect" would be wrong.
      const alreadyExists = error.body?.code === "USER_ALREADY_EXISTS";
      return {
        error: alreadyExists
          ? "An account with that email already exists."
          : "Could not create the account. Check your details and try again.",
      };
    }
    throw error;
  }

  redirect("/today");
}

export async function signOut(): Promise<void> {
  const { headers } = await import("next/headers");
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}
