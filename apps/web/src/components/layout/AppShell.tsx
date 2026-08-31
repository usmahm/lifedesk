import type { ReactNode } from "react";

import { TimerBar } from "@/features/timer/components/TimerBar";

import { MobileHeader } from "./MobileHeader";
import { MobileTabBar } from "./MobileTabBar";
import { SidebarRail } from "./SidebarRail";

/**
 * The application frame.
 *
 * Desktop: 240px rail, content column capped at 720px, timer bar docked bottom.
 * Mobile:  top bar with a drawer, timer bar, then the tab bar.
 *
 * Both are built here in the same component — the mobile layout is never a
 * follow-up pass. See .claude/rules/ui-components.md.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <SidebarRail />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[720px] px-4 py-6 md:px-6 md:py-10">{children}</div>
        </main>

        <TimerBar />
        <MobileTabBar />
      </div>
    </div>
  );
}
