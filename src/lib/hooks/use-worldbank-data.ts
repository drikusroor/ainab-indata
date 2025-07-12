import { useQuery } from '@tanstack/react-query'
import { getDataFileUrl, METADATA_FILE_URL } from '../constants'

/**
 * Interface for World Bank data row
 */
export interface WorldBankDataRow {
  [key: string]: string | number
}

/**
 * Hook to fetch and parse CSV data from GitHub raw content URLs
 * 
 * @param filename - The name of the CSV file in the data/split directory
 * @returns Query result with parsed CSV data
 */
export function useWorldBankData(filename: string) {
  return useQuery({
    queryKey: ['worldbank-data', filename],
    queryFn: async (): Promise<WorldBankDataRow[]> => {
      try {
        // Fetch the CSV file from GitHub raw content URL
        const response = await fetch(getDataFileUrl(filename))
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${filename}: ${response.statusText}`)
        }
        
        const csvText = await response.text()
        
        // Simple CSV parser (you might want to use a more robust solution for complex CSV)
        const lines = csvText.trim().split('\n')
        const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''))
        
        const data: WorldBankDataRow[] = lines.slice(1).map(line => {
          const values = line.split(',').map(value => value.trim().replace(/"/g, ''))
          const row: WorldBankDataRow = {}
          
          headers.forEach((header, index) => {
            const value = values[index]
            // Try to parse as number, fallback to string
            row[header] = isNaN(Number(value)) ? value : Number(value)
          })
          
          return row
        })
        
        return data
      } catch (error) {
        console.error(`Error fetching ${filename}:`, error)
        throw error
      }
    },
    
    // Enable query only if filename is provided
    enabled: !!filename,
    
    // Cache for 10 minutes since data files are relatively static
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  })
}

/**
 * Hook to get the list of available CSV files from GitHub
 * Fetches the metadata file to determine available datasets
 */
export function useAvailableDatasets() {
  return useQuery({
    queryKey: ['available-datasets'],
    queryFn: async (): Promise<string[]> => {
      try {
        // Fetch the metadata file from GitHub raw content URL
        const response = await fetch(METADATA_FILE_URL)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.statusText}`)
        }
        
        const csvText = await response.text()
        const lines = csvText.trim().split('\n')
        
        // Assuming metadata has a 'filename' column
        return lines.slice(1).map(line => {
          const values = line.split(',')
          return values[0].replace(/"/g, '') // First column should be filename
        })
      } catch (error) {
        console.error('Error fetching available datasets:', error)
        // Fallback: return empty array or throw
        return []
      }
    },
    
    // Cache for a longer time since available files don't change often
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  })
}
