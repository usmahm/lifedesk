import { DIGIT_ENTRY_TIMEOUT_MS } from "./constants";

/**
 * The typed-digit rule for a segment.
 *
 * Extracted as a pure function because the edge cases are where these fields
 * usually go wrong, and reasoning about them inside a pointer-and-keyboard
 * component is much harder than reading them here.
 *
 * The rules, in order:
 *   1. Digits typed close together build one number; a pause starts fresh.
 *   2. A digit that would overshoot the maximum starts fresh instead of being
 *      rejected — typing "6" into a 0–59 segment can only mean 6.
 *   3. Once no further digit could fit, the segment is done and focus should
 *      move on. "1" in a 0–23 segment waits for a second digit; "3" does not,
 *      because 30 is already past 23.
 */
export type DigitBuffer = { text: string; at: number };

export const EMPTY_BUFFER: DigitBuffer = { text: "", at: 0 };

export type DigitEntry = {
  value: number;
  buffer: DigitBuffer;
  /** No more digits can fit — hand focus to the next segment. */
  complete: boolean;
};

export function applyDigit(
  buffer: DigitBuffer,
  digit: string,
  max: number,
  now: number,
): DigitEntry {
  const isStale = now - buffer.at > DIGIT_ENTRY_TIMEOUT_MS;

  let text = (isStale ? "" : buffer.text) + digit;
  if (Number(text) > max) text = digit;

  const value = Number(text);
  const complete = text.length >= String(max).length || value * 10 > max;

  return {
    value,
    buffer: complete ? EMPTY_BUFFER : { text, at: now },
    complete,
  };
}
