import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRateData } from "@/services/rateExplorer/ratesApi";
import { useCallback } from "react";

export function useRateData(index: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["rateData", index],
    queryFn: () => fetchRateData(index, false),
    staleTime: 1000 * 60 * 30,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    enabled: !!index,
  });

  /** Manual refresh: scrape + overwrite Supabase shared cache. */
  const forceRefresh = useCallback(async () => {
    return queryClient.fetchQuery({
      queryKey: ["rateData", index],
      queryFn: () => fetchRateData(index, true),
    });
  }, [queryClient, index]);

  return {
    ...query,
    /** Alias used by Rate Explorer Refresh buttons — always force scrape. */
    refetch: forceRefresh,
    forceRefresh,
  };
}
