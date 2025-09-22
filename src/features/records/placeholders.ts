import type { RecordKey } from "./constants";

export function placeholderForKey(key: RecordKey): string {
  switch (key) {
    case "email":
      return "name@example.com";
    case "url":
      return "https://example.com";
    case "com.twitter":
    case "com.github":
    case "org.telegram":
      return "username";
    case "avatar":
      return "https://.../avatar.png";
    case "description":
      return "Tell the world about you";
    default:
      return "Not set";
  }
}
