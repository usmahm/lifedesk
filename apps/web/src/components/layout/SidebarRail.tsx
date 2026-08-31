import { Separator } from "@lifedesk/ui/components/separator";
import Link from "next/link";

import { SignOutButton } from "./SignOutButton";
import { AreaNavList } from "./AreaNavList";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";

/**
 * The desktop rail — 240px, hidden below `md`, where the tab bar takes over.
 * A server component; only the pieces that need the pathname are clients.
 */
export function SidebarRail() {
  return (
    <aside className="border-border bg-sidebar hidden w-60 shrink-0 flex-col border-r md:flex">
      <div className="flex h-14 items-center px-4">
        <Link
          href="/today"
          className="focus-visible:ring-ring rounded-sm text-base font-medium tracking-tight focus-visible:ring-2 focus-visible:outline-none"
        >
          <span className="text-primary">◐</span> LifeDesk
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <NavLinks />

        <Separator className="my-4" />

        <p className="text-muted-foreground px-2.5 pb-1.5 text-xs font-medium tracking-wide uppercase">
          Areas
        </p>
        <AreaNavList />
      </div>

      <div className="border-border space-y-1 border-t p-2">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </aside>
  );
}
