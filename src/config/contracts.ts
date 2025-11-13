// Contract addresses for different networks
export const CONTRACTS = {
  sepolia: {
    // Replace with your actual contract address
    entrypoint: "0xDB1819eCaD574C1399E51512C7a0711A1Bf19b85" as `0x${string}`,
  },
} as const;

// ZeroDev configuration
export const ZERODEV_CONFIG = {
  rpcUrl: import.meta.env.VITE_ZERODEV_RPC_URL,
  chainId: 11155111, // Sepolia
} as const;
