// Contract addresses for different networks
export const CONTRACTS = {
  sepolia: {
    // Replace with your actual contract address
    entrypoint: "0x593403CF4fC2761360cCB214Fc0999fcd7Df3aC4" as `0x${string}`,
  },
} as const;

// ZeroDev configuration
export const ZERODEV_CONFIG = {
  rpcUrl: import.meta.env.VITE_ZERODEV_RPC_URL,
  chainId: 11155111, // Sepolia
} as const;
