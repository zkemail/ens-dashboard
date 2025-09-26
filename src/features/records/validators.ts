import type { RecordKey } from "./constants";

export function normalizeValueForKey(key: RecordKey, raw: string): string {
  const value = (raw || "").trim();
  switch (key) {
    case "email":
      return value.toLowerCase();
    case "url": {
      if (!value) return value;
      const hasProtocol = /^https?:\/\//i.test(value);
      return hasProtocol ? value : `https://${value}`;
    }
    case "com.twitter":
    case "com.github":
    case "org.telegram": {
      const handle = value.replace(/^@+/, "").trim();
      return handle;
    }
    default:
      return value;
  }
}

export function validateValueForKey(
  key: RecordKey,
  value: string
): string | null {
  if (!value) return null; // allow clearing
  switch (key) {
    case "email": {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      return ok ? null : "Enter a valid email";
    }
    case "url": {
      try {
        new URL(value);
        return null;
      } catch {
        return "Enter a valid URL";
      }
    }
    case "com.twitter":
    case "com.github":
    case "org.telegram": {
      const ok = /^[A-Za-z0-9_.]{1,30}$/.test(value);
      return ok ? null : "Use letters, numbers, '_' or '.'";
    }
    default:
      return null;
  }
}

export function labelForKey(key: RecordKey): string {
  switch (key) {
    case "com.twitter":
      return "X";
    case "com.github":
      return "GitHub";
    case "org.telegram":
      return "Telegram";
    default:
      return key;
  }
}
