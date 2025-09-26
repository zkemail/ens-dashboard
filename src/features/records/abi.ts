import { parseAbi } from "viem";

export const setTextAbi = parseAbi([
  "function setText(bytes32 node,string key,string value)",
]);

export const textRecordVerifierAbi = parseAbi([
  "function verifyTextRecord(bytes32 node,string key,string value) view returns (bool)",
]);

export const entrypointAbi = parseAbi([
  "function entrypoint(bytes data)",
  "function encode(bytes proof,bytes32[] publicInputs) view returns (bytes)",
  "function dkimRegistryAddress() view returns (address)",
]);
