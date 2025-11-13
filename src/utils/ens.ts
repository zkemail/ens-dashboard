import { type Address, createPublicClient, getAddress, http, namehash } from "viem";
import { sepolia } from "viem/chains";
import { CONTRACTS, ZERODEV_CONFIG } from "../config/contracts";
import { entrypointAbi } from "../config/abi";

const client = createPublicClient({
	chain: sepolia,
	transport: http(ZERODEV_CONFIG.rpcUrl),
});

export function handleToEnsName(handleRaw: string): string {
	const handle = (handleRaw || "").trim().replace(/^@/, "");
	return handle ? `${handle}.x.zkemail.eth` : "";
}

export async function resolveEnsToPredictedAddress(name: string): Promise<Address | null> {
	try {
		if (!name) return null;
		const node = namehash(name);
		const addr = await client.readContract({
			address: CONTRACTS.sepolia.entrypoint,
			abi: entrypointAbi,
			functionName: "predictAddress",
			args: [node],
		});
		return getAddress(addr as Address);
	} catch {
		return null;
	}
}

export async function getSepoliaBalance(address: Address) {
	return client.getBalance({ address });
}

export function truncateMiddle(value: string, prefix = 6, suffix = 4) {
	if (!value) return "";
	if (value.length <= prefix + suffix + 3) return value;
	return `${value.slice(0, prefix)}...${value.slice(-suffix)}`;
}


