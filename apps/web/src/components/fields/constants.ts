/** Digits typed within this window build one number; a pause starts fresh. */
export const DIGIT_ENTRY_TIMEOUT_MS = 1000;

/** Vertical pixels per step while scrubbing. Short drags cover useful range. */
export const DRAG_PX_PER_STEP = 8;

/** Past this the pointer counts as a drag, not a click on the segment. */
export const DRAG_THRESHOLD_PX = 3;

export const MINUTE_BIG_STEP = 5;
export const HOUR_BIG_STEP = 1;

/** Ceiling for a duration's hours segment. Nothing here is planned in days. */
export const MAX_DURATION_HOURS = 23;

/** Coalesces a held arrow key into one write. Typing and dragging commit once anyway. */
export const COMMIT_DEBOUNCE_MS = 300;
