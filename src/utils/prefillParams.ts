import { PLATFORM_BY_KEY } from "../config/platforms";
import type { RecordKey } from "../config/platforms";

/**
 * Maps short, user-friendly platform names (used in deep links from external
 * tools like the Discord verification bot) to internal record keys.
 *
 * Also accepts the fully-qualified key directly (e.g. "com.discord"), so links
 * can use either form.
 */
const FRIENDLY_PLATFORM_ALIASES: Record<string, RecordKey> = {
  discord: "com.discord",
  twitter: "com.twitter",
  x: "com.twitter",
  github: "com.github",
  telegram: "org.telegram",
};

export function resolvePlatformKey(raw: string | null): RecordKey | null {
  if (!raw) return null;
  const lowered = raw.trim().toLowerCase();
  if (!lowered) return null;
  if (PLATFORM_BY_KEY.has(lowered)) return lowered as RecordKey;
  return FRIENDLY_PLATFORM_ALIASES[lowered] ?? null;
}
