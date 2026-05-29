import { useQuery } from "@tanstack/react-query";
import { sepolia } from "viem/chains";

export type OrderBy = "createdAt" | "labelName" | "expiryDate" | "name";
export type OrderDirection = "asc" | "desc";

// Sepolia ENS contracts. Token IDs minted by these are the names we want to list.
const ENS_BASE_REGISTRAR_ADDRESS =
  "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85";
const ENS_NAME_WRAPPER_ADDRESS =
  "0x0635513f179D50A207757E05759CbD106d7dFcE8";

interface EnsNameInfo {
  name: string;
  expiryDate?: number;
  createdAt?: number;
}

interface AlchemyNft {
  contract?: { address?: string };
  tokenId?: string;
  name?: string | null;
  title?: string | null;
  raw?: { metadata?: { name?: string } };
  acquiredAt?: { blockTimestamp?: string };
}

interface AlchemyNftsResponse {
  ownedNfts?: AlchemyNft[];
  pageKey?: string;
}

function getNftApiBase(): string {
  const apiKey = import.meta.env.VITE_ALCHEMY_API_KEY;
  return `https://eth-sepolia.g.alchemy.com/nft/v3/${apiKey}`;
}

// Alchemy's NFT API does not return ENS name metadata on Sepolia (`name`,
// `title`, `tokenUri`, `raw.metadata` are all empty for both Base Registrar
// and NameWrapper NFTs). Fall back to the ENS metadata service, which the
// official ENS app uses.
async function resolveEnsNameFromMetadata(
  contract: string,
  tokenId: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://metadata.ens.domains/sepolia/${contract}/${tokenId}`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { name?: string };
    const name = body.name?.trim();
    return name && name.includes(".") ? name : null;
  } catch {
    return null;
  }
}

async function fetchOwnedEnsNames(
  address: `0x${string}`,
): Promise<EnsNameInfo[]> {
  const base = getNftApiBase();
  const collected: AlchemyNft[] = [];

  let pageKey: string | undefined;
  do {
    const url = new URL(`${base}/getNFTsForOwner`);
    url.searchParams.set("owner", address);
    url.searchParams.append("contractAddresses[]", ENS_BASE_REGISTRAR_ADDRESS);
    url.searchParams.append("contractAddresses[]", ENS_NAME_WRAPPER_ADDRESS);
    url.searchParams.set("withMetadata", "true");
    url.searchParams.set("pageSize", "100");
    if (pageKey) url.searchParams.set("pageKey", pageKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Alchemy NFT API returned ${res.status}`);
    }
    const body = (await res.json()) as AlchemyNftsResponse;
    if (body.ownedNfts) collected.push(...body.ownedNfts);
    pageKey = body.pageKey;
  } while (pageKey);

  const resolved = await Promise.all(
    collected.map(async (nft) => {
      const contract = nft.contract?.address;
      const tokenId = nft.tokenId;
      if (!contract || !tokenId) return null;

      const inlineName =
        nft.name?.trim() ||
        nft.title?.trim() ||
        nft.raw?.metadata?.name?.trim() ||
        null;
      const name =
        inlineName && inlineName.includes(".")
          ? inlineName
          : await resolveEnsNameFromMetadata(contract, tokenId);
      if (!name) return null;

      const acquired = nft.acquiredAt?.blockTimestamp;
      return {
        name,
        createdAt: acquired ? Date.parse(acquired) : undefined,
      } satisfies EnsNameInfo;
    }),
  );

  const seen = new Map<string, EnsNameInfo>();
  for (const info of resolved) {
    if (!info) continue;
    const key = info.name.toLowerCase();
    if (!seen.has(key)) seen.set(key, info);
  }
  return Array.from(seen.values());
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
    pageSize = 20,
    orderBy = "createdAt",
    orderDirection = "desc",
    searchString = "",
  } = params;

  const isAddress = typeof address === "string" && address.startsWith("0x") && address.length === 42;

  const query = useQuery<EnsNameInfo[], Error>({
    queryKey: ["ens-names-nft", address?.toLowerCase(), sepolia.id],
    enabled: isAddress,
    queryFn: async () => {
      if (!isAddress) return [];
      return fetchOwnedEnsNames(address);
    },
  });

  let names = (query.data ?? []).map((n) => n.name).filter(Boolean) as string[];

  if (searchString) {
    const searchLower = searchString.toLowerCase();
    names = names.filter((name) => name.toLowerCase().includes(searchLower));
  }

  if (orderBy === "name") {
    names.sort((a, b) => {
      const comparison = a.localeCompare(b);
      return orderDirection === "asc" ? comparison : -comparison;
    });
  } else if (orderBy === "expiryDate" && query.data) {
    names.sort((a, b) => {
      const aInfo = query.data!.find((n) => n.name === a);
      const bInfo = query.data!.find((n) => n.name === b);
      const aExpiry = aInfo?.expiryDate ?? 0;
      const bExpiry = bInfo?.expiryDate ?? 0;
      const comparison = aExpiry - bExpiry;
      return orderDirection === "asc" ? comparison : -comparison;
    });
  } else if (orderBy === "createdAt" && query.data) {
    names.sort((a, b) => {
      const aInfo = query.data!.find((n) => n.name === a);
      const bInfo = query.data!.find((n) => n.name === b);
      const aCreated = aInfo?.createdAt ?? 0;
      const bCreated = bInfo?.createdAt ?? 0;
      const comparison = aCreated - bCreated;
      return orderDirection === "asc" ? comparison : -comparison;
    });
  }

  if (pageSize) {
    names = names.slice(0, pageSize);
  }

  return { ...query, names } as const;
}
