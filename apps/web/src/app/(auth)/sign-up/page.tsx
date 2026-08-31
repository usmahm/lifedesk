import type { Metadata } from "next";

import { AuthForm } from "@/features/auth/components/AuthForm";
import { signUp } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
  return <AuthForm mode="sign-up" action={signUp} />;
}
