import { QueryClient } from '@tanstack/react-query'

/**
 * TanStack Query client configuration
 * 
 * This configuration optimizes data fetching for World Bank datasets:
 * - 5 minute cache time for data files that don't change frequently
 * - 1 minute stale time to reduce unnecessary refetches
 * - Retry failed requests up to 3 times
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data stays in cache
      gcTime: 1000 * 60 * 5, // 5 minutes
      
      // How long data is considered fresh
      staleTime: 1000 * 60 * 1, // 1 minute
      
      // Retry failed requests
      retry: 3,
      
      // Don't refetch on window focus for data files
      refetchOnWindowFocus: false,
      
      // Don't refetch on reconnect for static data
      refetchOnReconnect: false,
    },
  },
})
