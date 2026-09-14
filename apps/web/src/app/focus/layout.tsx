import { Toaster } from "@lifedesk/ui/components/sonner";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { PomodoroEngine } from "@/features/timer/components/PomodoroEngine";
import { isSignedIn } from "@/lib/auth/session";

/**
 * Focus renders outside `AppShell` on purpose.
 *
 * A sibling of the `(app)` group rather than a member of it, so there is no
 * rail, tab bar or timer bar to hide — none of them mount. That is the whole
 * feature: the noise is absent rather than suppressed.
 *
 * The `Toaster` still comes along; notes and completion are real mutations and
 * need somewhere to report a failure.
 */
export default async function FocusLayout({ children }: { children: ReactNode }) {
  if (!(await isSignedIn())) redirect("/sign-in");

  return (
    <>
      {children}
      {/* Focus sits outside AppShell, so it carries its own driver — the cycle
          has to keep advancing while you're in here. */}
      <PomodoroEngine />
      <Toaster position="bottom-center" />
    </>
  );
}
