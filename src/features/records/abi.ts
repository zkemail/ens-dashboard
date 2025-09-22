import { parseAbi } from "viem";

export const setTextAbi = parseAbi([
  "function setText(bytes32 node,string key,string value)",
]);

export const textVerifierAbi = parseAbi([
  "function verifyTextRecord(bytes32 node,string key,string value) view returns (bool)",
]);
