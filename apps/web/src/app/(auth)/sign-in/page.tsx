import type { Metadata } from "next";

import { AuthForm } from "@/features/auth/components/AuthForm";
import { signIn } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return <AuthForm mode="sign-in" action={signIn} />;
}
