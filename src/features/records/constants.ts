export const COMMON_KEYS = [
  "email",
  "url",
  "avatar",
  "com.twitter",
  "com.github",
  "org.telegram",
  "description",
] as const;

export type RecordKey = (typeof COMMON_KEYS)[number];
