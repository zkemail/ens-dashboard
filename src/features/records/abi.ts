import { parseAbi } from "viem";

export const setTextAbi = parseAbi([
  "function setText(bytes32 node,string key,string value)",
]);

export const verifyTextRecordAbi = parseAbi([
  "function verifyTextRecord(bytes32 node,string key,string value) view returns (bool)",
]);
