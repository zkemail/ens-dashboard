import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { KERNEL_V3_1, getEntryPoint } from "@zerodev/sdk/constants";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { http, createPublicClient, encodeFunctionData } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { ZERODEV_CONFIG, CONTRACTS } from "../config/contracts";
import { entrypointAbi } from "../config/abi";

const chain = sepolia;
const entryPoint = getEntryPoint("0.7");
const kernelVersion = KERNEL_V3_1;

export async function submitProofWithZeroDev(
  proofData: `0x${string}`,
  publicOutputs: `0x${string}`[]
) {
  console.log("🚀 Starting ZeroDev submission process...");
  console.log("📊 Proof Data:", proofData);
  console.log("📊 Public Outputs:", publicOutputs);

  // Step 1: Generate a signer
  console.log("\n📝 Step 1: Generating signer...");
  const privateKey = generatePrivateKey();
  const signer = privateKeyToAccount(privateKey);
  console.log("✅ Signer created:", signer.address);

  // Step 2: Create public client
  console.log("\n📝 Step 2: Creating public client...");
  const publicClient = createPublicClient({
    transport: http(ZERODEV_CONFIG.rpcUrl),
    chain,
  });
  console.log("✅ Public client created");

  // Step 3: Encode the proof data first
  console.log(
    "\n📝 Step 3: Encoding proof data using contract's encode function..."
  );
  const encodedData = await publicClient.readContract({
    address: CONTRACTS.sepolia.entrypoint,
    abi: entrypointAbi,
    functionName: "encode",
    args: [proofData, publicOutputs],
  });
  console.log("✅ Encoded data:", encodedData);

  // Step 4: Create validator
  console.log("\n📝 Step 4: Creating ECDSA validator...");
  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer,
    entryPoint,
    kernelVersion,
  });
  console.log("✅ Validator created");

  // Step 5: Create Kernel account
  console.log("\n📝 Step 5: Creating Kernel account...");
  const account = await createKernelAccount(publicClient, {
    plugins: {
      sudo: ecdsaValidator,
    },
    entryPoint,
    kernelVersion,
  });
  console.log("✅ Kernel account created:", account.address);

  // Step 6: Create ZeroDev paymaster
  console.log("\n📝 Step 6: Creating ZeroDev paymaster...");
  const zerodevPaymaster = createZeroDevPaymasterClient({
    chain,
    transport: http(ZERODEV_CONFIG.rpcUrl),
  });
  console.log("✅ Paymaster created");

  // Step 7: Create Kernel account client
  console.log("\n📝 Step 7: Creating Kernel account client...");
  const kernelClient = createKernelAccountClient({
    account,
    chain,
    bundlerTransport: http(ZERODEV_CONFIG.rpcUrl),
    client: publicClient,
    paymaster: {
      getPaymasterData(userOperation) {
        return zerodevPaymaster.sponsorUserOperation({ userOperation });
      },
    },
  });
  console.log("✅ Kernel client created");
  console.log("🏦 Account address:", kernelClient.account.address);

  // Step 8: Prepare the entrypoint call data
  console.log("\n📝 Step 8: Preparing entrypoint call data...");
  const entrypointCallData = encodeFunctionData({
    abi: entrypointAbi,
    functionName: "entrypoint",
    args: [encodedData],
  });
  console.log("✅ Entrypoint call data:", entrypointCallData);

  // Step 9: Send UserOp
  console.log("\n📝 Step 9: Sending UserOperation...");
  const userOpHash = await kernelClient.sendUserOperation({
    callData: await kernelClient.account.encodeCalls([
      {
        to: CONTRACTS.sepolia.entrypoint,
        value: BigInt(0),
        data: entrypointCallData,
      },
    ]),
  });
  console.log("✅ UserOp hash:", userOpHash);

  // Step 10: Wait for completion
  console.log("\n⏳ Step 10: Waiting for UserOp to complete...");
  const receipt = await kernelClient.waitForUserOperationReceipt({
    hash: userOpHash,
    timeout: 1000 * 60, // 60 seconds timeout
  });
  console.log("✅ UserOp completed!");
  console.log("📋 Receipt:", receipt);

  const txHash = receipt.receipt.transactionHash;
  console.log("💳 Transaction Hash:", txHash);
  console.log(
    `🔗 View on Etherscan: https://sepolia.etherscan.io/tx/${txHash}`
  );

  return {
    userOpHash,
    transactionHash: txHash,
    receipt,
    accountAddress: kernelClient.account.address,
  };
}
