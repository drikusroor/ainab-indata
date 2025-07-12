# TanStack Query Setup and Usage

This document explains how TanStack Query is configured and used in the AINAB InData project for efficient data fetching and caching of World Bank datasets.

## Overview

TanStack Query (formerly React Query) is used for:

- **Fetching World Bank CSV data** from GitHub raw content URLs
- **Caching responses** to avoid unnecessary re-fetches
- **Background updates** and data synchronization
- **Loading states** and error handling
- **Performance optimization** through intelligent caching
- **Keeping bundle size small** by fetching data externally instead of bundling

## Configuration

The QueryClient is configured in `src/lib/query-client.ts` with optimized settings for World Bank data:

```typescript
import { queryClient } from './lib/query-client'
```

### Key Configuration Options

- **Cache Time (gcTime)**: 5 minutes - how long data stays in cache
- **Stale Time**: 1 minute - how long data is considered fresh
- **Retry**: 3 attempts for failed requests
- **Window Focus Refetch**: Disabled for static data files
- **Reconnect Refetch**: Disabled for static data files

## Usage Examples

### Fetching World Bank Data

```typescript
import { useWorldBankData } from '@/lib/hooks/use-worldbank-data'

function CountryDataComponent() {
  const { data, isLoading, error } = useWorldBankData('abw-gdp-data.csv')
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return (
    <div>
      {data?.map((row, index) => (
        <div key={index}>{/* Render your data */}</div>
      ))}
    </div>
  )
}
```

### Getting Available Datasets

```typescript
import { useAvailableDatasets } from '@/lib/hooks/use-worldbank-data'

function DatasetSelector() {
  const { data: datasets, isLoading } = useAvailableDatasets()
  
  if (isLoading) return <div>Loading datasets...</div>
  
  return (
    <select>
      {datasets?.map(filename => (
        <option key={filename} value={filename}>
          {filename}
        </option>
      ))}
    </select>
  )
}
```

## Development Tools

In development mode, the React Query DevTools are automatically enabled:

- **Query Inspector**: View all queries and their states
- **Cache Explorer**: Inspect cached data
- **Network Timeline**: See fetch timings and patterns
- **Mutation Tracker**: Monitor data updates

Access the DevTools by looking for the React Query icon in the bottom corner of your browser during development.

## Best Practices

### 1. Query Keys
Use descriptive, hierarchical query keys:
```typescript
// Good
['worldbank-data', 'gdp', 'USA']
['worldbank-data', 'population', 'DEU']

// Bad
['data']
['country']
```

### 2. Error Handling
Always handle loading and error states:
```typescript
const { data, isLoading, error, isError } = useWorldBankData(filename)

if (isLoading) return <LoadingSpinner />
if (isError) return <ErrorMessage error={error} />
if (!data) return <NoDataMessage />
```

### 3. Conditional Queries
Use the `enabled` option for conditional fetching:
```typescript
const { data } = useWorldBankData(filename, {
  enabled: !!filename && userHasPermission
})
```

### 4. Data Transformation
Transform data in the query function for consistency:
```typescript
queryFn: async () => {
  const rawData = await fetchCSV()
  return rawData.map(transformToStandardFormat)
}
```

## File Structure

```
src/
├── lib/
│   ├── constants.ts                 # GitHub configuration and URL builders  
│   ├── query-client.ts              # TanStack Query configuration
│   └── hooks/
│       └── use-worldbank-data.ts    # Custom hooks for World Bank data
├── frontend.tsx                     # QueryClientProvider setup
└── components/                      # Components using the hooks
```

## Performance Considerations

### Data File Optimization
- CSV files are cached for 10 minutes (stale time)
- Memory cache retained for 30 minutes (gc time)
- Failed requests retry up to 3 times
- No unnecessary refetches on window focus/reconnect

### Memory Management
- Large datasets are parsed in the query function
- Consider pagination for very large files
- Use React.memo() for components rendering large lists

### Network Optimization
- Parallel fetching of multiple datasets when needed
- Intelligent caching reduces redundant requests
- Background updates keep data fresh

## Extending the System

### Adding New Data Sources
1. Create a new hook in `src/lib/hooks/`
2. Define appropriate query keys and cache settings
3. Implement data transformation logic
4. Add TypeScript interfaces for data structure

### Custom Cache Strategies
Different data types may need different caching strategies:
```typescript
// Real-time data - shorter cache
staleTime: 1000 * 30, // 30 seconds

// Static reference data - longer cache
staleTime: 1000 * 60 * 60 * 24, // 24 hours
```

## Troubleshooting

### Common Issues

1. **Data not loading**: Check network tab for 404s, verify file paths
2. **Stale data**: Adjust `staleTime` settings or manually invalidate queries
3. **Memory issues**: Implement pagination or virtual scrolling for large datasets
4. **DevTools not showing**: Ensure `NODE_ENV` is set to "development"

### Debug Commands
```typescript
// Invalidate all queries
queryClient.invalidateQueries()

// Get query data manually
const data = queryClient.getQueryData(['worldbank-data', filename])

// Check query state
const state = queryClient.getQueryState(['worldbank-data', filename])
```

## GitHub Data Source Strategy

This project uses a unique approach to handle large World Bank datasets efficiently:

### Why GitHub Raw URLs?

Instead of bundling CSV files with the application (which would result in a massive bundle size), we fetch data directly from GitHub's raw content URLs. This provides several benefits:

- **Small Bundle Size**: Application remains lightweight and fast to download
- **Dynamic Data Access**: Can access any processed dataset without rebuilding
- **Version Control**: Data updates automatically when the repository is updated
- **CDN Benefits**: GitHub's global CDN ensures fast data delivery worldwide
- **Cost Effective**: No additional hosting costs for large data files

### URL Structure

Data files are accessed using this pattern:
```
https://raw.githubusercontent.com/{owner}/{repo}/refs/heads/{branch}/{path}/{filename}
```

For this project:
```
https://raw.githubusercontent.com/drikusroor/ainab-indata/refs/heads/main/data/split/abw-agconfertzs.csv
```

### Configuration

The GitHub configuration is centralized in `src/lib/constants.ts`:

```typescript
export const GITHUB_CONFIG = {
  owner: 'drikusroor',
  repo: 'ainab-indata', 
  branch: 'main',
  dataPath: 'data/split',
}

// Helper function to build URLs
export function getDataFileUrl(filename: string): string {
  return `${GITHUB_RAW_BASE_URL}/${filename}`
}
```

### Benefits for Caching

This approach works excellently with TanStack Query's caching strategy:
- **Network requests are cached** for 10+ minutes
- **Failed requests retry** automatically  
- **Background updates** keep data fresh
- **Offline support** through cached responses
