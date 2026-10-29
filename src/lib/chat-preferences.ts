type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;
const key = "tiffy_preferences";

export function loadBanterMode(storage?: PreferenceStorage): boolean {
  try {
    const data = JSON.parse(storage?.getItem(key) || "{}");
    return data?.banterMode === true;
  } catch { return false; }
}

export function saveBanterMode(storage: PreferenceStorage, enabled: boolean) {
  savePreference(storage, "banterMode", enabled);
}

export function loadReplyPreferences(storage?: PreferenceStorage) {
  try {
    const data = JSON.parse(storage?.getItem(key) || "{}");
    return { notifications: data?.notifications === true, sounds: data?.sounds === true };
  } catch { return { notifications: false, sounds: false }; }
}

export function saveReplyPreference(storage: PreferenceStorage, name: "notifications" | "sounds", enabled: boolean) {
  savePreference(storage, name, enabled);
}

function savePreference(storage: PreferenceStorage, name: string, enabled: boolean) {
  let previous = {};
  try {
    const data = JSON.parse(storage.getItem(key) || "{}");
    if (data && typeof data === "object" && !Array.isArray(data)) previous = data;
  } catch { /* Replace malformed preferences without touching conversations. */ }
  storage.setItem(key, JSON.stringify({ ...previous, [name]: enabled }));
}
