"use client";

import { Button } from "@lifedesk/ui/components/button";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { useIsHydrated } from "@/lib/hooks/useIsHydrated";

const ORDER = ["light", "dark", "system"] as const;

const LABEL = { light: "Light", dark: "Dark", system: "System" } as const;

const ICON = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // The resolved theme isn't known until after hydration; rendering the real
  // icon before then guarantees a mismatch.
  const isHydrated = useIsHydrated();
  const current = (isHydrated ? theme : "system") as keyof typeof LABEL;
  const Icon = ICON[current] ?? Monitor;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2.5 px-2.5 text-muted-foreground"
      onClick={() => setTheme(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!)}
      aria-label={`Theme: ${LABEL[current] ?? "System"}. Click to change.`}
    >
      <Icon className="size-4" />
      <span suppressHydrationWarning>{LABEL[current] ?? "System"}</span>
    </Button>
  );
}
