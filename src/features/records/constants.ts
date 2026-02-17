/** Record keys that are not defined in platforms.json (email, url, avatar, description). */
export const NON_PLATFORM_KEYS = [
  "email",
  "url",
  "avatar",
  "description",
] as const;

export type BaseRecordKey = (typeof NON_PLATFORM_KEYS)[number];
