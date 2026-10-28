import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchIRSRates } from '@/services/rateExplorer/irsApi';
import { IRSResponse } from '@/services/rateExplorer/irsIndices';
import { useCallback } from 'react';

export function useIRSData(currency: string) {
  const queryClient = useQueryClient();

  const query = useQuery<IRSResponse>({
    queryKey: ['irs-rates', currency],
    queryFn: () => fetchIRSRates(currency, false),
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    enabled: !!currency,
  });

  /** Manual refresh: scrape + overwrite Supabase shared cache. */
  const forceRefresh = useCallback(async () => {
    return queryClient.fetchQuery({
      queryKey: ['irs-rates', currency],
      queryFn: () => fetchIRSRates(currency, true),
    });
  }, [queryClient, currency]);

  return {
    ...query,
    refetch: forceRefresh,
    forceRefresh,
  };
}
