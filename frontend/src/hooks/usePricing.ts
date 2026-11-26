import { useQuery } from '@tanstack/react-query';
import { getPricing } from '../api';

/** The shop's price list from GET /api/pricing. Fetched once per visit; prices don't change mid-quote. */
export function usePricing() {
  return useQuery({ queryKey: ['pricing'], queryFn: getPricing, staleTime: Infinity });
}
