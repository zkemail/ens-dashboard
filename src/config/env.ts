// Environment configuration helpers

const rawVerifyEndpoint = (typeof import.meta !== "undefined" &&
  (import.meta as any)?.env?.VITE_VERIFY_COMMAND_ENDPOINT) as
  | string
  | undefined;

export const VERIFY_COMMAND_ENDPOINT = (
  rawVerifyEndpoint && rawVerifyEndpoint.length > 0
    ? rawVerifyEndpoint
    : "https://enss.zk.email/command"
) as string;
