import { type Address, createPublicClient, getAddress, http } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { normalize } from "viem/ens";
import { ZERODEV_CONFIG } from "../config/contracts";

const sepoliaClient = createPublicClient({
	chain: sepolia,
	transport: http(ZERODEV_CONFIG.rpcUrl),
});

const mainnetClient = createPublicClient({
	chain: mainnet,
	transport: http(),
});

export function handleToEnsName(handleRaw: string): string {
	const handle = (handleRaw || "")
		.trim()
		.replace(/^@/, "")
		.replace(/_/g, "$"); // Replace all underscores with dollar signs
	return handle ? `${handle}.x.zkemail.eth` : "";
}

export async function resolveEnsToPredictedAddress(name: string): Promise<Address | null> {
	try {
		if (!name) return null;
		const normalizedName = normalize(name);
		const addr = await sepoliaClient.getEnsAddress({
			name: normalizedName,
		});
		if (!addr) return null;
		return getAddress(addr);
	} catch {
		return null;
	}
}

/**
 * Resolves an ENS name or returns the address if it's already a valid address.
 * First tries Sepolia, then falls back to mainnet for ENS resolution.
 */
export async function resolveEnsOrAddress(input: string): Promise<Address | null> {
	try {
		if (!input) return null;
		const trimmed = input.trim();
		
		// If it's already a valid Ethereum address, return it
		if (trimmed.match(/^0x[a-fA-F0-9]{40}$/)) {
			return getAddress(trimmed);
		}
		
		// Otherwise, try to resolve as ENS name
		const normalizedName = normalize(trimmed);
		
		// First try Sepolia
		try {
			const sepoliaAddr = await sepoliaClient.getEnsAddress({
				name: normalizedName,
			});
			if (sepoliaAddr) {
				return getAddress(sepoliaAddr);
			}
		} catch {
			// If Sepolia fails, continue to mainnet
		}
		
		// Fall back to mainnet
		try {
			const mainnetAddr = await mainnetClient.getEnsAddress({
				name: normalizedName,
			});
			if (mainnetAddr) {
				return getAddress(mainnetAddr);
			}
		} catch {
			// If mainnet also fails, return null
		}
		
		return null;
	} catch {
		return null;
	}
}

export async function getSepoliaBalance(address: Address) {
	return sepoliaClient.getBalance({ address });
}

export function truncateMiddle(value: string, prefix = 6, suffix = 4) {
	if (!value) return "";
	if (value.length <= prefix + suffix + 3) return value;
	return `${value.slice(0, prefix)}...${value.slice(-suffix)}`;
}


