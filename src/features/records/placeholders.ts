import type { RecordKey } from "../../config/platforms";
import { getPlatform } from "../../config/platforms";

export function placeholderForKey(key: RecordKey): string {
  // Check platform config first
  const platform = getPlatform(key);
  if (platform) return platform.placeholder;

  switch (key) {
    case "email":
      return "name@example.com";
    case "url":
      return "https://example.com";
    case "avatar":
      return "https://.../avatar.png";
    case "description":
      return "Tell the world about you";
    default:
      return "Not set";
  }
}
