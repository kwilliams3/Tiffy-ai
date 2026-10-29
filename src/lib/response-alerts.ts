import { loadReplyPreferences } from "./chat-preferences.ts";

export interface ReplyAlertPlatform {
  isHidden: () => boolean;
  permission: () => NotificationPermission | "unsupported";
  notify: (conversationId: string) => Promise<void>;
  playSound: () => void;
}

// Alert failures never turn a successfully received reply into a chat error.
export async function deliverReplyAlerts(conversationId: string, storage: Pick<Storage, "getItem" | "setItem"> | undefined, platform: ReplyAlertPlatform) {
  const preferences = loadReplyPreferences(storage);
  if (preferences.sounds) {
    try { platform.playSound(); } catch { /* Audio may be blocked by the browser. */ }
  }
  if (preferences.notifications && platform.isHidden() && platform.permission() === "granted") {
    try { await platform.notify(conversationId); } catch { /* Permissions can change at any time. */ }
  }
}

let audio: AudioContext | undefined;
function audioConstructor() {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}
export function supportsReplySound() { return !!audioConstructor(); }

// Call synchronously from a click/submit handler to satisfy autoplay rules.
export async function prepareReplySound(): Promise<boolean> {
  try {
    const Constructor = audioConstructor();
    if (!Constructor) return false;
    if (!audio || audio.state === "closed") audio = new Constructor();
    if (audio.state !== "running") {
      const resumed = await new Promise<boolean>(resolve => {
        const timer = setTimeout(() => resolve(false), 1500);
        audio!.resume().then(() => { clearTimeout(timer); resolve(true); }, () => { clearTimeout(timer); resolve(false); });
      });
      if (!resumed) return false;
    }
    return audio.state === "running";
  } catch { return false; }
}

export function playReplySound() {
  if (!audio || audio.state !== "running") return;
  const context = audio;
  [587.33, 783.99].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * 0.12;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.035, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start); oscillator.stop(start + 0.24);
  });
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !window.isSecureContext || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestReplyNotifications(): Promise<NotificationPermission | "unsupported"> {
  const permission = notificationPermission();
  if (permission !== "default") return permission;
  return Notification.requestPermission();
}

export async function showReplyNotification(conversationId: string) {
  if (notificationPermission() !== "granted") return;
  const options: NotificationOptions = {
    body: "Ta réponse est prête. Clique pour retrouver la conversation.",
    icon: "/tiffy-icon-192.png", badge: "/tiffy-icon-192.png", tag: `tiffy-reply-${conversationId}`,
    silent: true, data: { conversationId },
  };
  // Service-worker notifications also work on supported mobile browsers.
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.active) { await registration.showNotification("Tiffy a répondu", options); return; }
    } catch { /* Fall back to a desktop notification when possible. */ }
  }
  const notification = new Notification("Tiffy a répondu", options);
  notification.onclick = () => {
    notification.close(); window.focus();
    window.location.assign(`/?conversation=${encodeURIComponent(conversationId)}`);
  };
}

export const browserReplyAlerts: ReplyAlertPlatform = {
  isHidden: () => document.visibilityState === "hidden",
  permission: notificationPermission,
  notify: showReplyNotification,
  playSound: playReplySound,
};
