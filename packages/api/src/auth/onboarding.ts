import type { AreaColor } from "@lifedesk/contracts";

/**
 * What a brand-new account starts with.
 *
 * Deliberately few and deliberately broad. The first thing anyone does is
 * rename these, so five plausible buckets beat twenty specific ones — and an
 * empty account is a dead end, since every screen filters by area.
 */
export const DEFAULT_ONBOARDING_AREAS: { name: string; color: AreaColor; icon: string }[] = [
  { name: "Work", color: "clay", icon: "briefcase" },
  { name: "Personal", color: "teal", icon: "home" },
  { name: "Learning", color: "indigo", icon: "book-open" },
  { name: "Health", color: "olive", icon: "heart-pulse" },
  { name: "Admin", color: "slate", icon: "folder" },
];
