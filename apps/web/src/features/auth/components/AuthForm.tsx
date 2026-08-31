"use client";

import { Button } from "@lifedesk/ui/components/button";
import { Input } from "@lifedesk/ui/components/input";
import { Label } from "@lifedesk/ui/components/label";
import Link from "next/link";
import { useActionState } from "react";

import { If } from "@/components/If";
import type { AuthFormState } from "@/lib/auth/actions";

/**
 * Sign in and sign up.
 *
 * The form, its validation, and its error surface are real. Only the
 * credential check is stubbed in Phase 1 — Better Auth replaces the action
 * body and leaves this component untouched. See docs/PLAN.md §3.
 */
export function AuthForm({
  mode,
  action,
}: {
  mode: "sign-in" | "sign-up";
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });

  const isSignUp = mode === "sign-up";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8 space-y-2">
        <p className="text-base font-medium tracking-tight">
          <span className="text-primary">◐</span> LifeDesk
        </p>
        <h1 className="font-serif text-3xl leading-tight">
          {isSignUp ? "Make a desk of your own." : "Welcome back."}
        </h1>
      </div>

      <form action={formAction} className="space-y-4">
        <If condition={isSignUp}>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" autoComplete="name" required className="h-11" />
          </div>
        </If>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={8}
            className="h-11"
          />
        </div>

        <If condition={state.error !== null}>
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        </If>

        {/* Only the button is disabled while pending — never the whole form. */}
        <Button type="submit" className="h-11 w-full" disabled={isPending}>
          {isPending ? "One moment…" : isSignUp ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {isSignUp ? "Already have an account? " : "No account yet? "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="text-foreground underline underline-offset-4"
        >
          {isSignUp ? "Sign in" : "Create one"}
        </Link>
      </p>

      <p className="mt-8 text-xs text-muted-foreground">
        Phase 1 preview — any email and an 8-character password will get you in.
      </p>
    </div>
  );
}
