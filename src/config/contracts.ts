// Contract addresses for different networks
export const CONTRACTS = {
  sepolia: {
    // Replace with your actual contract address
    entrypoint: "0x638A1f8aDB665F78aD3f218EabFa88fa244e4a0F" as `0x${string}`,
  },
} as const;

// ZeroDev configuration
export const ZERODEV_CONFIG = {
  rpcUrl: import.meta.env.VITE_ZERODEV_RPC_URL,
  chainId: 11155111, // Sepolia
} as const;
