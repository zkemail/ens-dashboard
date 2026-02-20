import type { RecordKey } from "../../config/platforms";
import { getPlatform } from "../../config/platforms";

export function normalizeValueForKey(
  key: RecordKey | string,
  raw: string,
): string {
  const value = (raw || "").trim();

  // Check platform config first
  const platform = getPlatform(key);
  if (platform?.normalize) return platform.normalize(value);

  switch (key) {
    case "email":
      return value.toLowerCase();
    case "url": {
      if (!value) return value;
      const hasProtocol = /^https?:\/\//i.test(value);
      return hasProtocol ? value : `https://${value}`;
    }
    default:
      return value;
  }
}

export function validateValueForKey(
  key: RecordKey | string,
  value: string,
): string | null {
  if (!value) return null;

  // Check platform config first
  const platform = getPlatform(key);
  if (platform?.validate) return platform.validate(value);

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
    default:
      return null;
  }
}

export function labelForKey(key: RecordKey | string): string {
  const platform = getPlatform(key);
  if (platform) return platform.label;
  return key;
}
