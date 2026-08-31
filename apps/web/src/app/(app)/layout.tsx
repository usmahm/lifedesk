import { Toaster } from "@lifedesk/ui/components/sonner";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { isSignedIn } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await isSignedIn())) redirect("/sign-in");

  return (
    <>
      <AppShell>{children}</AppShell>
      <Toaster position="bottom-center" />
    </>
  );
}
