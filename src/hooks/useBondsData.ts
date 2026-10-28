import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllCountries, fetchCountryYields } from "@/services/rateExplorer/bondsApi";
import { useCallback } from "react";

export function useCountriesBonds() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["bonds", "countries"],
    queryFn: () => fetchAllCountries(false),
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    enabled: false, // Manual trigger only
  });

  const forceRefresh = useCallback(async () => {
    return queryClient.fetchQuery({
      queryKey: ["bonds", "countries"],
      queryFn: () => fetchAllCountries(true),
    });
  }, [queryClient]);

  return {
    ...query,
    refetch: forceRefresh,
    forceRefresh,
  };
}

export function useCountryYields(countrySlug: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["bonds", "country", countrySlug],
    queryFn: () => fetchCountryYields(countrySlug, false),
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    enabled: !!countrySlug,
  });

  const forceRefresh = useCallback(async () => {
    if (!countrySlug) return;
    return queryClient.fetchQuery({
      queryKey: ["bonds", "country", countrySlug],
      queryFn: () => fetchCountryYields(countrySlug, true),
    });
  }, [queryClient, countrySlug]);

  return {
    ...query,
    refetch: forceRefresh,
    forceRefresh,
  };
}
