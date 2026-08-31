import { CalendarDays, CircleDot, Inbox, LayoutGrid, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile tab bar. Space is tight — only the essentials. */
  onTabBar: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", icon: Sun, onTabBar: true },
  { href: "/week", label: "Week", icon: CalendarDays, onTabBar: true },
  { href: "/inbox", label: "Inbox", icon: Inbox, onTabBar: true },
  { href: "/areas", label: "Areas", icon: LayoutGrid, onTabBar: true },
  { href: "/sessions", label: "Sessions", icon: CircleDot, onTabBar: false },
];

export const RAIL_WIDTH_PX = 240;
