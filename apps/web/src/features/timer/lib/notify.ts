"use client";

import { CHIME } from "../constants";

/**
 * Telling you a phase ended when the app isn't in front of you.
 *
 * Both paths are best-effort by design: a blocked notification or a browser
 * that refuses to start audio must never break the timer, which is the thing
 * that actually matters.
 */

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Asked when Pomodoro mode is switched on, never on page load.
 *
 * `requestPermission` needs a user gesture, and a permission prompt that
 * appears unprompted is the fastest way to get permanently denied.
 */
export async function requestNotificationPermission(): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== "default") return;

  try {
    await Notification.requestPermission();
  } catch {
    // Denied or unavailable — the chime and the tab title still carry it.
  }
}

export function notify(title: string, body: string): void {
  if (!notificationsSupported() || Notification.permission !== "granted") return;

  try {
    new Notification(title, { body, tag: "lifedesk-pomodoro" });
  } catch {
    // Some browsers refuse constructed notifications outside a service worker.
  }
}

/**
 * A two-tone chime, synthesised rather than shipped.
 *
 * An oscillator pair costs nothing to load, needs no licence, and cannot 404 —
 * and two tones are enough to tell "work over" from "break over" without
 * looking, which is the whole job.
 *
 * The context is created lazily on first use: constructing one before a user
 * gesture leaves it suspended, and browsers count that against you.
 */
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    audioContext ??= new AudioContext();
    return audioContext;
  } catch {
    return null;
  }
}

export function playChime(kind: "work-end" | "break-end"): void {
  const context = getAudioContext();
  if (!context) return;

  try {
    // Autoplay policy can leave it suspended until a gesture resumes it.
    if (context.state === "suspended") void context.resume();

    const tones = kind === "work-end" ? CHIME.workEndHz : CHIME.breakEndHz;
    const toneSec = CHIME.toneMs / 1000;

    tones.forEach((hz, index) => {
      const startAt = context.currentTime + index * toneSec;

      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = hz;

      // A hard start and stop clicks audibly; ramp the edges instead.
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(CHIME.gain, startAt + 0.01);
      gain.gain.linearRampToValueAtTime(0, startAt + toneSec);

      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + toneSec);
    });
  } catch {
    // Audio unavailable — the notification and tab title still carry it.
  }
}
