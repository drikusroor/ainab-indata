import { useQuery } from '@tanstack/react-query'
import { getDataFileUrl } from '../constants'
import { getFilenameFromCodes } from './use-worldbank-data'
import type { Country, CountrySeriesData } from './use-worldbank-data'

/**
 * Represents data for a single series across multiple countries
 */
export interface MultiSeriesEntry {
  seriesCode: string
  countries: CountrySeriesData[]
}

/**
 * Parse a year/value CSV line, treating `..` and empty as null
 */
function parseYearValue(line: string): { year: number; value: number | null } {
  const [yearStr, valueStr] = line.split(',').map(v => v.trim().replace(/"/g, ''))
  const year = parseInt(yearStr, 10)
  const value =
    valueStr === '' || valueStr === '..' ? null : parseFloat(valueStr)
  return { year, value: isNaN(value as number) ? null : value }
}

/**
 * Fetch the country name map from _countries.csv
 */
async function fetchCountryMap(): Promise<Map<string, string>> {
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
 * Fetch data for a single country-series pair
 */
async function fetchCountrySeriesData(
  country: Country,
  seriesCode: string
): Promise<CountrySeriesData> {
  const filename = getFilenameFromCodes(country.code, seriesCode)
  try {
    const response = await fetch(getDataFileUrl(filename))
    if (!response.ok) {
      return { country, data: [] }
    }
    const text = await response.text()
    const lines = text.trim().split('\n')
    const data = lines
      .slice(1)
      .map(parseYearValue)
      .filter(item => !isNaN(item.year))
    return { country, data }
  } catch {
    return { country, data: [] }
  }
}

/**
 * Hook to fetch 2+ series for multiple countries.
 *
 * Returns one MultiSeriesEntry per seriesCode, each containing
 * CountrySeriesData for every requested country.
 *
 * staleTime: 10 min, gcTime: 30 min
 */
export function useMultiSeriesData(
  seriesCodes: string[],
  countryCodes: string[]
) {
  return useQuery({
    queryKey: ['multi-series-data', seriesCodes, countryCodes],
    queryFn: async (): Promise<MultiSeriesEntry[]> => {
      const countryMap = await fetchCountryMap()

      const countries: Country[] = countryCodes.map(code => ({
        code,
        name: countryMap.get(code) ?? code,
      }))

      const results: MultiSeriesEntry[] = await Promise.all(
        seriesCodes.map(async seriesCode => {
          const countryDataList = await Promise.all(
            countries.map(country => fetchCountrySeriesData(country, seriesCode))
          )
          return { seriesCode, countries: countryDataList }
        })
      )

      return results
    },
    enabled: seriesCodes.length > 0 && countryCodes.length > 0,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  })
}
