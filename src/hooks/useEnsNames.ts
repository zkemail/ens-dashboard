import { useQuery } from "@tanstack/react-query";
import type { NameWithRelation } from "@ensdomains/ensjs/subgraph";
import { createEnsSubgraphClient, addEnsContracts } from "@ensdomains/ensjs";
import { http, type Chain } from "viem";
import { mainnet, sepolia } from "viem/chains";

export type OrderBy = "createdAt" | "labelName" | "expiryDate" | "name";
export type OrderDirection = "asc" | "desc";

function getChainFromId(chainId?: number): Chain | undefined {
  if (chainId === mainnet.id) return mainnet;
  if (chainId === sepolia.id) return sepolia;
  return chainId ? undefined : mainnet;
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

  const query = useQuery<NameWithRelation[], Error>({
    queryKey: [
      "ens-names",
      address?.toLowerCase(),
      chain?.id ?? "unknown",
      pageSize,
      orderBy,
      orderDirection,
      searchString?.toLowerCase(),
    ],
    enabled: Boolean(chain && address),
    queryFn: async () => {
      if (!chain) return [] as NameWithRelation[];
      const client = createEnsSubgraphClient({
        chain: addEnsContracts(chain),
        transport: http(),
      });
      const result = await client.getNamesForAddress({
        address,
        orderBy: orderBy as "createdAt" | "labelName" | "expiryDate" | "name",
        orderDirection,
        pageSize,
        filter: { searchString },
      });
      return result;
    },
  });

  const names = (query.data ?? [])
    .map((n) => n.name)
    .filter(Boolean) as string[];
  return { ...query, names } as const;
}
