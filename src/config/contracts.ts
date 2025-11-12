// Contract addresses for different networks
export const CONTRACTS = {
  sepolia: {
    // Replace with your actual contract address
    entrypoint: "0xDC7b42532e8cBdEd0C453cB16116B40298a0E0e3" as `0x${string}`,
  },
} as const;

// ZeroDev configuration
export const ZERODEV_CONFIG = {
  rpcUrl:
    "https://rpc.zerodev.app/api/v3/1bff909d-a326-476e-bc31-db6c7a447fc2/chain/11155111",
  chainId: 11155111, // Sepolia
} as const;
