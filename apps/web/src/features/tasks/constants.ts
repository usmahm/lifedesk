/**
 * Radix Select treats an empty string as "no selection" and throws if you pass
 * one as an item value, so "no area / no project" needs a real sentinel.
 */
export const NO_VALUE = "__none__";
