import { useQuery } from '@tanstack/react-query'
import { getDataFileUrl } from '../constants'

/**
 * Interface for World Bank data row
 */
export interface WorldBankDataRow {
  [key: string]: string | number
}

/**
 * Interface for country data
 */
export interface Country {
  code: string
  name: string
}

/**
 * Interface for data series
 */
export interface Series {
  code: string
  name: string
}

/**
 * Interface for multi-country comparison data
 */
export interface CountrySeriesData {
  country: Country
  data: { year: number; value: number | null }[]
}

/**
 * Shared utility functions for CSV parsing
 */
const parseYearValueLine = (line: string) => {
  const [year, value] = line.split(',').map(v => v.trim().replace(/"/g, ''))
  return {
    year: parseInt(year),
    value: value === '' || value === '..' ? null : parseFloat(value)
  }
}

/**
 * Generate filename from country and series codes
 */
export function getFilenameFromCodes(countryCode: string, seriesCode: string): string {
  return `${countryCode.toLowerCase()}-${seriesCode.toLowerCase().replace(/[^a-z0-9]/g, '')}.csv`
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
 * @deprecated Use useCountries and useSeries instead
 * Hook to get the list of available CSV files from GitHub
 * Fetches the metadata file to determine available datasets
 */
export function useAvailableDatasets() {
  return useQuery({
    queryKey: ['available-datasets'],
    queryFn: async (): Promise<string[]> => {
      // This is deprecated - returning empty array
      return []
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  })
}

/**
 * Hook to fetch available countries
 */
export function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: async (): Promise<Country[]> => {
      try {
        const response = await fetch(getDataFileUrl('_countries.csv'))
        
        if (!response.ok) {
          throw new Error(`Failed to fetch countries: ${response.statusText}`)
        }
        
        const csvText = await response.text()
        const lines = csvText.trim().split('\n')
        
        const parseCountryLine = (line: string) => {
          const [code, name] = line.split(',').map(value => value.trim().replace(/"/g, ''))
          return { code, name }
        }

        return lines.slice(1)
          .map(parseCountryLine)
          .filter(country => country.code && country.name && country.code !== 'Last Updated:') // Filter out empty rows and metadata
      } catch (error) {
        console.error('Error fetching countries:', error)
        throw error
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  })
}

/**
 * Hook to fetch available data series
 */
export function useSeries() {
  return useQuery({
    queryKey: ['series'],
    queryFn: async (): Promise<Series[]> => {
      try {
        const response = await fetch(getDataFileUrl('_series.csv'))
        
        if (!response.ok) {
          throw new Error(`Failed to fetch series: ${response.statusText}`)
        }
        
        const csvText = await response.text()
        const lines = csvText.trim().split('\n')
        
        const parseSeriesLine = (line: string) => {
          const [code, name] = line.split(',').map(value => value.trim().replace(/"/g, ''))
          return { code, name }
        }

        return lines.slice(1)
          .map(parseSeriesLine)
          .filter(series => series.code && series.name && series.code.trim() !== '') // Filter out empty rows
      } catch (error) {
        console.error('Error fetching series:', error)
        throw error
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  })
}

/**
 * Hook to fetch data for a specific country-series combination
 */
export function useCountrySeriesData(countryCode: string, seriesCode: string) {
  const filename = getFilenameFromCodes(countryCode, seriesCode)
  
  return useQuery({
    queryKey: ['country-series-data', countryCode, seriesCode],
    queryFn: async (): Promise<{ year: number; value: number | null }[]> => {
      try {
        const response = await fetch(getDataFileUrl(filename))
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${filename}: ${response.statusText}`)
        }
        
        const csvText = await response.text()
        const lines = csvText.trim().split('\n')
        
        return lines.slice(1).map(parseYearValueLine).filter(item => !isNaN(item.year))
      } catch (error) {
        console.error(`Error fetching ${filename}:`, error)
        throw error
      }
    },
    enabled: !!(countryCode && seriesCode),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  })
}

/**
 * Hook to fetch data for multiple countries for a single series
 */
export function useMultiCountryData(countryCodes: string[], seriesCode: string) {
  return useQuery({
    queryKey: ['multi-country-data', countryCodes, seriesCode],
    queryFn: async (): Promise<CountrySeriesData[]> => {
      if (!seriesCode || countryCodes.length === 0) {
        return []
      }

      // First fetch countries data to get country names
      const countriesResponse = await fetch(getDataFileUrl('_countries.csv'))
      const countriesText = await countriesResponse.text()
      const countryLines = countriesText.trim().split('\n')
      const countryMap = new Map<string, string>()
      
      countryLines.slice(1).forEach(line => {
        const [code, name] = line.split(',').map(value => value.trim().replace(/"/g, ''))
        if (code && name && code !== 'Last Updated:') {
          countryMap.set(code, name)
        }
      })

      // Fetch data for each country
      const fetchCountryData = async (countryCode: string) => {
        const country = { code: countryCode, name: countryMap.get(countryCode) || countryCode }
        
        try {
          const filename = getFilenameFromCodes(countryCode, seriesCode)
          const response = await fetch(getDataFileUrl(filename))
          
          if (!response.ok) {
            return { country, data: [] }
          }
          
          const csvText = await response.text()
          const lines = csvText.trim().split('\n')
          
          const data = lines.slice(1).map(parseYearValueLine).filter(item => !isNaN(item.year))
          
          return { country, data }
        } catch (error) {
          console.error(`Error fetching data for ${countryCode}:`, error)
          return { country, data: [] }
        }
      }

      const promises = countryCodes.map(fetchCountryData)

      return Promise.all(promises)
    },
    enabled: !!(seriesCode && countryCodes.length > 0),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  })
}
