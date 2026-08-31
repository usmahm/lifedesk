"use client";

import { cn } from "@lifedesk/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "./constants";

/**
 * The mobile tab bar. Sits below the timer bar, above the home indicator.
 * Every target is at least 44px. Hidden from `md` up, where the rail takes over.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const tabs = NAV_ITEMS.filter((item) => item.onTabBar);

  return (
    <nav
      aria-label="Main"
      className="grid border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-14 flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
              isActive ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
