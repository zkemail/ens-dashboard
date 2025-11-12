# Setup Guide

## Contract Configuration

Before you can submit proofs onchain, you need to set the contract address:

### Option 1: Direct Edit (Quick Start)
Edit `src/config/contracts.ts` and replace the placeholder contract address:

```typescript
export const CONTRACTS = {
  sepolia: {
    entrypoint: "0xYourActualContractAddress" as `0x${string}`,
  },
} as const;
```

### Option 2: Environment Variable
1. Create a `.env` file in the project root
2. Add your contract address:
   ```
   VITE_CONTRACT_ADDRESS=0xYourActualContractAddress
   ```
3. Restart the dev server

## How It Works

### Proof Generation
1. Upload a `.eml` file (password reset email from X/Twitter)
2. Enter a command (default: withdrawal to specified address)
3. Click "Generate Proof"
4. Wait for the ZK proof to be generated (~30-60 seconds)

### Onchain Submission (Gasless via ZeroDev)
1. After proof generation, click "Submit Onchain"
2. The app will:
   - Extract proof data and public outputs
   - Call the contract's `encode(proof, publicOutputs)` function
   - Submit the encoded data to the `entrypoint(data)` function
   - Use ZeroDev for gasless transactions (no wallet needed!)
3. View the transaction on Etherscan

## Key Features

- ✅ **No Wallet Required**: Uses ZeroDev for account abstraction
- ✅ **Gasless Transactions**: All gas fees are sponsored
- ✅ **Detailed Logging**: Check browser console for step-by-step execution
- ✅ **Sepolia Testnet**: Deployed on Ethereum Sepolia

## ZeroDev Configuration

The app uses ZeroDev with the following configuration:
- **Chain**: Sepolia (Chain ID: 11155111)
- **RPC URL**: Pre-configured in `src/config/contracts.ts`
- **Paymaster**: Sponsors all transaction gas fees
- **Explorer**: Etherscan (https://sepolia.etherscan.io)

## Debugging

All steps are logged to the browser console with emoji prefixes:
- 🚀 Starting process
- 📝 Step execution
- ✅ Success
- ❌ Error
- 📊 Data/parameters
- 🔄 Processing
- ⏳ Waiting
- 🎉 Completion

Open DevTools (F12) to see detailed logs during proof generation and submission.

