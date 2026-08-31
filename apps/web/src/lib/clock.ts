/**
 * The browser clock.
 *
 * The single place in the app allowed to read the local time. Everything else
 * takes `now` as an argument, which is what makes components deterministic in
 * tests and consistent between server and client render.
 *
 * The local clock is never trusted on its own — see `skewCorrectedNow` in
 * @lifedesk/core/time. The server reports its own `now` alongside the running
 * session, and the offset is applied to every local read, so a user whose
 * laptop is twenty minutes fast still sees correct elapsed time.
 *
 * See .claude/rules/dates-and-timezones.md.
 */

export function browserNow(): Date {
  return new Date();
}
