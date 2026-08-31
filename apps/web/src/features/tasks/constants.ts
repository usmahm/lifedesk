/**
 * Radix Select treats an empty string as "no selection" and throws if you pass
 * one as an item value, so "no area / no project" needs a real sentinel.
 */
export const NO_VALUE = "__none__";

/** A block created from nothing gets an hour rather than zero length. */
export const DEFAULT_BLOCK_MINUTES = 60;

/** Where a block starts if you set only its end. 09:00. */
export const DEFAULT_BLOCK_START_MIN = 9 * 60;
