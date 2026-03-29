import { useQuery } from '@tanstack/react-query'
import { getDataFileUrl } from '../constants'
import { getFilenameFromCodes } from './use-worldbank-data'

/**
 * A single data point: one country, one year, one value
 */
export interface CountryYearValue {
  countryCode: string
  countryName: string
  year: number
  value: number
}

const BATCH_SIZE = 20

/**
 * Parse _index.csv and return all country codes that have data for the given series
 */
async function fetchCountriesForSeries(seriesCode: string): Promise<string[]> {
  const response = await fetch(getDataFileUrl('_index.csv'))
  if (!response.ok) {
    throw new Error(`Failed to fetch _index.csv: ${response.statusText}`)
  }
  const text = await response.text()
  const lines = text.trim().split('\n')
  const upperSeries = seriesCode.toUpperCase()
  const codes: string[] = []
  // Header line: "Country Code,Series Code"
  lines.slice(1).forEach(line => {
    const [countryCode, lineSeriesCode] = line
      .split(',')
      .map(v => v.trim().replace(/"/g, ''))
    if (lineSeriesCode && lineSeriesCode.toUpperCase() === upperSeries && countryCode) {
      codes.push(countryCode)
    }
  })
  return codes
}

/**
 * Fetch country name map from _countries.csv
 */
async function fetchCountryNameMap(): Promise<Map<string, string>> {
  const response = await fetch(getDataFileUrl('_countries.csv'))
  if (!response.ok) {
    throw new Error(`Failed to fetch _countries.csv: ${response.statusText}`)
  }
  const text = await response.text()
  const lines = text.trim().split('\n')
  const map = new Map<string, string>()
  lines.slice(1).forEach(line => {
    const [code, name] = line.split(',').map(v => v.trim().replace(/"/g, ''))
    if (code && name && code !== 'Last Updated:') {
      map.set(code, name)
    }
  })
  return map
}

/**
 * Fetch all year/value rows for a single country-series, returning CountryYearValue entries
 */
async function fetchCountryData(
  countryCode: string,
  countryName: string,
  seriesCode: string
): Promise<CountryYearValue[]> {
  const filename = getFilenameFromCodes(countryCode, seriesCode)
  try {
    const response = await fetch(getDataFileUrl(filename))
    if (!response.ok) return []
    const text = await response.text()
    const lines = text.trim().split('\n')
    const results: CountryYearValue[] = []
    lines.slice(1).forEach(line => {
      const [yearStr, valueStr] = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const year = parseInt(yearStr, 10)
      if (isNaN(year)) return
      if (valueStr === '' || valueStr === '..') return
      const value = parseFloat(valueStr)
      if (isNaN(value)) return
      results.push({ countryCode, countryName, year, value })
    })
    return results
  } catch {
    return []
  }
}

/**
 * Hook to fetch one series for ALL countries that have data for it.
 *
 * Reads _index.csv first to determine which countries have the series,
 * then fetches in batches of 20 to limit concurrency.
 *
 * Returns a flat array of CountryYearValue.
 */
export function useAllCountriesForSeries(seriesCode: string) {
  return useQuery({
    queryKey: ['all-countries-for-series', seriesCode],
    queryFn: async (): Promise<CountryYearValue[]> => {
      const [countryCodes, nameMap] = await Promise.all([
        fetchCountriesForSeries(seriesCode),
        fetchCountryNameMap(),
      ])

      const allData: CountryYearValue[] = []

      // Process in batches to limit concurrency
      for (let i = 0; i < countryCodes.length; i += BATCH_SIZE) {
        const batch = countryCodes.slice(i, i + BATCH_SIZE)
        const batchResults = await Promise.all(
          batch.map(code =>
            fetchCountryData(code, nameMap.get(code) ?? code, seriesCode)
          )
        )
        batchResults.forEach(rows => allData.push(...rows))
      }

      return allData
    },
    enabled: !!seriesCode,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  })
}
