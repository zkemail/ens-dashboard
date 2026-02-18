import { NON_PLATFORM_KEYS } from "../features/records/constants";
import type { BaseRecordKey } from "../features/records/constants";

/** Raw platform entry from platforms.json (no functions). */
export interface PlatformConfigData {
  key: string;
  label: string;
  placeholder: string;
  urlTemplate?: string;
  displayPrefix?: string;
  verifiable: boolean;
  blueprintSlug?: string;
  commandTemplate?: string;
  gmailQuery?: string;
  verifierAddress?: string;
  estimatedProveDurationMs?: number;
}

/** Runtime platform config with optional proof fields and derived functions. */
export interface PlatformConfig {
  key: string;
  label: string;
  placeholder: string;
  /** If true, this platform supports proof-based verification (has verifier + blueprint). */
  verifiable: boolean;
  verifierAddress?: `0x${string}`;
  blueprintSlug?: string;
  /** Gmail search query for OAuth flow (e.g. from:info@x.com subject:"Password reset request"). */
  gmailQuery?: string;
  buildCommand?: (ensName: string) => string;
  estimatedProveDurationMs?: number;
  normalize?: (raw: string) => string;
  validate?: (value: string) => string | null;
  formatUrl?: (handle: string) => string;
  displayPrefix?: string;
}

const handleNormalize = (raw: string) => raw.replace(/^@+/, "").trim();
const handleValidate = (v: string) =>
  /^[A-Za-z0-9_.]{1,30}$/.test(v) ? null : "Use letters, numbers, '_' or '.'";

function fromTemplate(
  template: string,
  replacers: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(replacers)) {
    out = out.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return out;
}

import platformsJson from "./platforms.json";

const platformsData: PlatformConfigData[] =
  platformsJson as PlatformConfigData[];

export const PLATFORMS: PlatformConfig[] = platformsData.map((d) => {
  const config: PlatformConfig = {
    key: d.key,
    label: d.label,
    placeholder: d.placeholder,
    verifiable: d.verifiable,
    displayPrefix: d.displayPrefix,
  };

  if (d.verifiable) {
    if (d.verifierAddress)
      config.verifierAddress = d.verifierAddress as `0x${string}`;
    if (d.blueprintSlug) config.blueprintSlug = d.blueprintSlug;
    if (d.gmailQuery) config.gmailQuery = d.gmailQuery;
    if (d.estimatedProveDurationMs)
      config.estimatedProveDurationMs = d.estimatedProveDurationMs;
    if (d.commandTemplate)
      config.buildCommand = (ensName: string) =>
        fromTemplate(d.commandTemplate!, { ensName });
  }

  config.normalize = handleNormalize;
  config.validate = handleValidate;
  if (d.urlTemplate)
    config.formatUrl = (handle: string) =>
      fromTemplate(d.urlTemplate!, { handle });

  return config;
});

export const PLATFORM_BY_KEY = new Map<string, PlatformConfig>(
  PLATFORMS.map((p) => [p.key, p]),
);

export function getPlatform(key: string): PlatformConfig | undefined {
  return PLATFORM_BY_KEY.get(key);
}

/** True only when the platform has proof-based verification (verifier + blueprint). */
export function isPlatformVerifiable(key: string): boolean {
  const p = PLATFORM_BY_KEY.get(key);
  return p?.verifiable === true;
}

/** Type for a valid record key (base keys + any platform key from config). */
export type RecordKey = BaseRecordKey | (typeof PLATFORMS)[number]["key"];

/** All record keys: non-platform (email, url, avatar, description) + platform keys from platforms.json. */
export const RECORD_KEYS: readonly RecordKey[] = [
  ...NON_PLATFORM_KEYS,
  ...PLATFORMS.map((p) => p.key as RecordKey),
];
