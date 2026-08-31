"use client";

import { Button } from "@lifedesk/ui/components/button";
import { Separator } from "@lifedesk/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@lifedesk/ui/components/sheet";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AreaNavList } from "./AreaNavList";
import { NAV_ITEMS } from "./constants";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Mobile top bar: the drawer trigger and the current section's name.
 * The rail's full contents live in the drawer.
 */
export function MobileHeader() {
  const pathname = usePathname();
  // Closed from the link handlers below, not from a pathname effect — the
  // click is the actual cause, and reacting to the pathname instead just
  // triggers a second render pass.
  const [open, setOpen] = useState(false);

  const current = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b border-border bg-background px-2 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>

        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="px-4 py-4">
            <SheetTitle className="text-left text-base font-medium tracking-tight">
              <span className="text-primary">◐</span> LifeDesk
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-2">
            <NavLinks onNavigate={() => setOpen(false)} />
            <Separator className="my-4" />
            <p className="px-2.5 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Areas
            </p>
            <AreaNavList onNavigate={() => setOpen(false)} />
          </div>

          <div className="border-t border-border p-2">
            <ThemeToggle />
          </div>
        </SheetContent>
      </Sheet>

      <h1 className="flex-1 text-center text-sm font-medium">{current?.label ?? "LifeDesk"}</h1>

      {/* Balances the menu button so the title sits truly centred. */}
      <div className="size-9" aria-hidden />
    </header>
  );
}
