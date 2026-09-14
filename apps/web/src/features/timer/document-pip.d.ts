/**
 * Document Picture-in-Picture, which is not in `lib.dom.d.ts` as of TypeScript
 * 6 — verified, not assumed.
 *
 * Declared narrowly rather than reached for with a cast: only the two members
 * actually used are described, so a typo still fails to compile.
 *
 * Chrome and Edge 130+, Firefox 151+. Safari does not implement it at all,
 * desktop or iOS, which is why `window.documentPictureInPicture` is optional
 * here and every caller must handle its absence.
 */

interface DocumentPictureInPictureOptions {
  width?: number;
  height?: number;
  disallowReturnToOpener?: boolean;
  preferInitialWindowPlacement?: boolean;
}

interface DocumentPictureInPicture extends EventTarget {
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
  readonly window: Window | null;
}

interface Window {
  readonly documentPictureInPicture?: DocumentPictureInPicture;
}
