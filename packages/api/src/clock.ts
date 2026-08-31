/**
 * The server clock.
 *
 * Injected through context rather than read inline, so every procedure is
 * testable against a fixed instant. This file and packages/core/src/time are
 * the only places allowed to construct a Date.
 * See .claude/rules/dates-and-timezones.md.
 */

export type Clock = () => Date;

export const systemClock: Clock = () => new Date();

/** Test seam: a clock frozen at a known instant. */
export function fixedClock(at: Date): Clock {
  return () => new Date(at.getTime());
}
