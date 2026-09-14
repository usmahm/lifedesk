"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { PIP_WINDOW_SIZE } from "../constants";

/**
 * A floating always-on-top window, the web's answer to a menu-bar timer.
 *
 * Returns null for `pipWindow` until one is open; callers portal into
 * `pipWindow.document.body`.
 *
 * Unsupported in Safari and iOS Safari entirely, so `isSupported` gates the
 * button and the tab-title countdown carries those browsers instead.
 */

/**
 * Browser capability as an external store rather than an effect.
 *
 * It is a fact about the browser that never changes, so there is nothing to
 * subscribe to — but reading it during render would mismatch on hydration, and
 * setting it from an effect is a `setState`-in-effect that this repo forbids.
 * The server snapshot is false and React reconciles on hydration.
 */
const NEVER_CHANGES = () => () => undefined;

function readSupport(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

export function usePictureInPicture() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const isSupported = useSyncExternalStore(NEVER_CHANGES, readSupport, () => false);

  // Mirrors `pipWindow` so the unmount cleanup can close it without depending
  // on the state — a dependency there would tear the window down on every
  // change rather than only on unmount.
  const windowRef = useRef<Window | null>(null);

  const open = useCallback(async () => {
    const api = window.documentPictureInPicture;
    if (!api) return;

    try {
      // Must come from a user gesture — the browser refuses otherwise.
      const next = await api.requestWindow(PIP_WINDOW_SIZE);

      copyStyles(next);
      mirrorTheme(next);

      // `pagehide` is the close signal. Without it the pop-out button keeps
      // claiming the window is open after the user has closed it.
      next.addEventListener(
        "pagehide",
        () => {
          windowRef.current = null;
          setPipWindow(null);
        },
        { once: true },
      );

      windowRef.current = next;
      setPipWindow(next);
    } catch {
      // Refused (no gesture, or one already open) — leave the bar as it was.
    }
  }, []);

  const close = useCallback(() => {
    windowRef.current?.close();
    windowRef.current = null;
    setPipWindow(null);
  }, []);

  /**
   * Keep the theme in step while the window is open.
   *
   * `mirrorTheme` only runs once, at open. Now that the window survives
   * navigation it can easily outlive a theme toggle, and a dark app with a
   * white floating timer is worse than no floating timer.
   */
  useEffect(() => {
    if (!pipWindow) return;

    const observer = new MutationObserver(() => mirrorTheme(pipWindow));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => observer.disconnect();
  }, [pipWindow]);

  // Closed when the owner unmounts, or it hangs around with a frozen clock.
  // The owner is the root provider, so in practice that is a full teardown.
  useEffect(
    () => () => {
      windowRef.current?.close();
      windowRef.current = null;
    },
    [],
  );

  return { pipWindow, isSupported, isOpen: pipWindow !== null, open, close };
}

/**
 * Styles do not cross into the PiP document — it is a separate document with
 * an empty head.
 *
 * Both node types are needed: Next injects Tailwind as an inline `<style>` in
 * development and links a stylesheet in production, so handling only one works
 * in exactly one of the two.
 */
function copyStyles(target: Window): void {
  for (const node of document.querySelectorAll('style, link[rel="stylesheet"]')) {
    target.document.head.append(node.cloneNode(true));
  }
}

/**
 * `next-themes` writes `class="dark"` on the opener's `<html>`. The PiP
 * document has its own root, so without this a dark app pops out a white
 * window.
 */
function mirrorTheme(target: Window): void {
  target.document.documentElement.className = document.documentElement.className;
  target.document.documentElement.style.colorScheme = document.documentElement.style.colorScheme;
  target.document.body.classList.add("bg-background", "text-foreground");
}
