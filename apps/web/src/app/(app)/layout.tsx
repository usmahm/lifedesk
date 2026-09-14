import { Toaster } from "@lifedesk/ui/components/sonner";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { PomodoroEngine } from "@/features/timer/components/PomodoroEngine";
import { isSignedIn } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await isSignedIn())) redirect("/sign-in");

  return (
    <>
      <AppShell>{children}</AppShell>
      {/* The single driver of the Pomodoro cycle for this layout. Focus mounts
          its own; the two layouts are mutually exclusive. */}
      <PomodoroEngine />
      <Toaster position="bottom-center" />
    </>
  );
}
