// Contract addresses for different networks
export const CONTRACTS = {
  sepolia: {
    // Replace with your actual contract address
    entrypoint: "0x638A1f8aDB665F78aD3f218EabFa88fa244e4a0F" as `0x${string}`,
  },
} as const;

// ZeroDev configuration
export const ZERODEV_CONFIG = {
  rpcUrl:
    "https://rpc.zerodev.app/api/v3/1bff909d-a326-476e-bc31-db6c7a447fc2/chain/11155111",
  chainId: 11155111, // Sepolia
} as const;
