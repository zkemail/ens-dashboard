import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { namehash } from "viem/ens";

export type OrderBy = "createdAt" | "labelName" | "expiryDate" | "name";
export type OrderDirection = "asc" | "desc";

// ENS Registry contract address (same for Sepolia)
const ENS_REGISTRY_ADDRESS =
  "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as `0x${string}`;

// ENS Registry ABI
const ENS_REGISTRY_ABI = parseAbi([
  "event Transfer(address indexed owner, address indexed to, uint256 indexed tokenId)",
  "function owner(bytes32 node) view returns (address)",
  "function resolver(bytes32 node) view returns (address)",
]);

// ENS Base Registrar ABI (ERC-721)
const ENS_BASE_REGISTRAR_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function nameExpires(uint256 tokenId) view returns (uint256)",
  "event NameRegistered(string name, bytes32 indexed label, address indexed owner, uint256 cost, uint256 expires)",
  "event NameRenewed(string name, bytes32 indexed label, uint256 cost, uint256 expires)",
]);

// Event definitions for getLogs
const NameRegisteredEvent = parseAbi([
  "event NameRegistered(string name, bytes32 indexed label, address indexed owner, uint256 cost, uint256 expires)",
])[0];

const TransferEvent = parseAbi([
  "event Transfer(address indexed owner, address indexed to, uint256 indexed tokenId)",
])[0];

// ENS Base Registrar address (same for Sepolia)
const ENS_BASE_REGISTRAR_ADDRESS =
  "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85" as `0x${string}`;

// Resolver ABI - for getting name from resolver
const RESOLVER_ABI = parseAbi([
  "function name(bytes32 node) view returns (string)",
]);

interface EnsNameInfo {
  name: string;
  namehash: `0x${string}`;
  expiryDate?: number;
  createdAt?: number;
}

function getChainFromId(chainId?: number): typeof sepolia | undefined {
  if (chainId === sepolia.id) return sepolia;
  return undefined;
}

async function resolveNameFromNamehash(
  publicClient: ReturnType<typeof createPublicClient>,
  registryAddress: `0x${string}`,
  namehash: `0x${string}`
): Promise<string | null> {
  try {
    // Get resolver address
    const resolverAddress = await publicClient.readContract({
      address: registryAddress,
      abi: ENS_REGISTRY_ABI,
      functionName: "resolver",
      args: [namehash],
    });

    if (
      !resolverAddress ||
      resolverAddress === "0x0000000000000000000000000000000000000000"
    ) {
      return null;
    }

    // Try to get name from resolver
    try {
      const name = await publicClient.readContract({
        address: resolverAddress,
        abi: RESOLVER_ABI,
        functionName: "name",
        args: [namehash],
      });
      return name || null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function getRpcUrl(): string {
  const apiKey = import.meta.env.VITE_ALCHEMY_API_KEY;
  return `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`;
}

async function getAllEnsNamesViaRpc(
  address: `0x${string}`
): Promise<EnsNameInfo[]> {
  const rpcUrl = getRpcUrl();
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const registryAddress = ENS_REGISTRY_ADDRESS;
  const registrarAddress = ENS_BASE_REGISTRAR_ADDRESS;

  try {
    const allNames = new Map<string, EnsNameInfo>();
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = 0n; // Start from genesis for Sepolia

    // Method 1: Query NameRegistered events from Base Registrar to get .eth names
    // This gives us the actual name strings
    try {
      const nameRegisteredLogs = await publicClient.getLogs({
        address: registrarAddress,
        event: NameRegisteredEvent,
        args: {
          owner: address,
        },
        fromBlock,
        toBlock: currentBlock,
      });

      for (const log of nameRegisteredLogs) {
        if (log.args.name && log.args.label) {
          const name = log.args.name as string;
          const namehashValue = namehash(name);

          // Verify current ownership
          try {
            const owner = await publicClient.readContract({
              address: registryAddress,
              abi: ENS_REGISTRY_ABI,
              functionName: "owner",
              args: [namehashValue],
            });

            if (owner.toLowerCase() === address.toLowerCase()) {
              // Get expiry date
              let expiryDate: number | undefined;
              try {
                // Convert bytes32 label to bigint for nameExpires call
                const labelAsBigInt = BigInt(log.args.label as `0x${string}`);
                const expires = await publicClient.readContract({
                  address: registrarAddress,
                  abi: ENS_BASE_REGISTRAR_ABI,
                  functionName: "nameExpires",
                  args: [labelAsBigInt],
                });
                expiryDate = Number(expires) * 1000;
              } catch {
                // Use expiry from event if available
                if (log.args.expires) {
                  expiryDate = Number(log.args.expires) * 1000;
                }
              }

              allNames.set(namehashValue.toLowerCase(), {
                name,
                namehash: namehashValue,
                expiryDate,
                createdAt: Number(log.blockNumber) * 12000, // Approximate timestamp
              });
            }
          } catch (error) {
            console.warn(`Failed to verify ownership for ${name}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn("Error querying NameRegistered events:", error);
    }

    // Method 2: Query Transfer events from ENS Registry for all names (including subdomains)
    try {
      const transferLogs = await publicClient.getLogs({
        address: registryAddress,
        event: TransferEvent,
        args: {
          to: address,
        },
        fromBlock,
        toBlock: currentBlock,
      });

      // Process Transfer events in parallel
      const resolvePromises = transferLogs.map(async (log) => {
        if (!log.args.tokenId) return;

        // Convert bigint tokenId to bytes32 hex string (pad to 32 bytes)
        const tokenIdBigInt = log.args.tokenId as bigint;
        const namehashValue = `0x${tokenIdBigInt
          .toString(16)
          .padStart(64, "0")}` as `0x${string}`;
        const namehashKey = namehashValue.toLowerCase();

        // Skip if we already have this name from Method 1
        if (allNames.has(namehashKey)) return;

        try {
          // Verify current ownership
          const owner = await publicClient.readContract({
            address: registryAddress,
            abi: ENS_REGISTRY_ABI,
            functionName: "owner",
            args: [namehashValue],
          });

          if (owner.toLowerCase() === address.toLowerCase()) {
            // Try to resolve name from resolver
            const resolvedName = await resolveNameFromNamehash(
              publicClient,
              registryAddress,
              namehashValue
            );

            // If we can't resolve, we'll still include it with namehash as identifier
            allNames.set(namehashKey, {
              name: resolvedName || namehashValue,
              namehash: namehashValue,
              createdAt: Number(log.blockNumber) * 12000,
            });
          }
        } catch (error) {
          console.warn(`Failed to process namehash ${namehashValue}:`, error);
        }
      });

      await Promise.all(resolvePromises);
    } catch (error) {
      console.warn("Error querying Transfer events:", error);
    }

    return Array.from(allNames.values());
  } catch (error) {
    console.error("Error fetching ENS names via RPC:", error);
    return [];
  }
}

export function useEnsNamesForAddress(params: {
  address: `0x${string}`;
  chainId?: number;
  pageSize?: number;
  orderBy?: OrderBy;
  orderDirection?: OrderDirection;
  searchString?: string;
}) {
  const {
    address,
    chainId,
    pageSize = 20,
    orderBy = "createdAt",
    orderDirection = "desc",
    searchString = "",
  } = params;

  const chain = getChainFromId(chainId);

  const query = useQuery<EnsNameInfo[], Error>({
    queryKey: ["ens-names-rpc", address?.toLowerCase(), sepolia.id],
    enabled: Boolean(chain && address),
    queryFn: async () => {
      if (!chain || !address) return [];
      return getAllEnsNamesViaRpc(address);
    },
  });

  // Process and filter names
  let names = (query.data ?? [])
    .map((n) => {
      // If name is just a namehash, try to normalize it or return empty
      // For now, return namehash as identifier
      return n.name && n.name !== n.namehash ? n.name : n.namehash;
    })
    .filter(Boolean) as string[];

  // Apply search filter
  if (searchString) {
    const searchLower = searchString.toLowerCase();
    names = names.filter((name) => name.toLowerCase().includes(searchLower));
  }

  // Apply sorting
  if (orderBy === "name") {
    names.sort((a, b) => {
      const comparison = a.localeCompare(b);
      return orderDirection === "asc" ? comparison : -comparison;
    });
  } else if (orderBy === "expiryDate" && query.data) {
    names.sort((a, b) => {
      const aInfo = query.data!.find((n) => n.name === a || n.namehash === a);
      const bInfo = query.data!.find((n) => n.name === b || n.namehash === b);
      const aExpiry = aInfo?.expiryDate ?? 0;
      const bExpiry = bInfo?.expiryDate ?? 0;
      const comparison = aExpiry - bExpiry;
      return orderDirection === "asc" ? comparison : -comparison;
    });
  } else if (orderBy === "createdAt" && query.data) {
    names.sort((a, b) => {
      const aInfo = query.data!.find((n) => n.name === a || n.namehash === a);
      const bInfo = query.data!.find((n) => n.name === b || n.namehash === b);
      const aCreated = aInfo?.createdAt ?? 0;
      const bCreated = bInfo?.createdAt ?? 0;
      const comparison = aCreated - bCreated;
      return orderDirection === "asc" ? comparison : -comparison;
    });
  }

  // Apply pagination
  if (pageSize) {
    names = names.slice(0, pageSize);
  }

  return { ...query, names } as const;
}
