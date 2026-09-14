/**
 * Marks that the navigation into Focus came from inside the app, so exiting
 * can use `router.back()` rather than pushing a fresh entry.
 */
export const FOCUS_ORIGIN_PARAM = "from";

/** Where exiting lands when there is no origin — a direct load or a bookmark. */
export const FOCUS_FALLBACK_PATH = "/today";

export const FOCUS_PATH = "/focus";

/**
 * Narrower than the app's 720px content column.
 *
 * There is one thing on this page; the extra width would only be space for
 * something else to creep into.
 */
export const FOCUS_COLUMN = "max-w-[560px]";
