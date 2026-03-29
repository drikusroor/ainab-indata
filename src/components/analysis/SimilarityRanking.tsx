import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { SeriesSelect } from '@/components/SeriesSelect'
import { useCountries, useSeries } from '@/lib/hooks/use-worldbank-data'
import { getDataFileUrl } from '@/lib/constants'
import { getFilenameFromCodes } from '@/lib/hooks/use-worldbank-data'
import { zScoreNormalize, euclideanDistance, similarityScore } from '@/lib/statistics'
import type { CountryYearValue } from '@/lib/hooks/use-all-countries-for-series'

const RANK_COLORS = [
  'rgb(76, 175, 80)',
  'rgb(139, 195, 74)',
  'rgb(205, 220, 57)',
  'rgb(255, 193, 7)',
  'rgb(255, 152, 0)',
  'rgb(255, 87, 34)',
  'rgb(244, 67, 54)',
  'rgb(233, 30, 99)',
  'rgb(156, 39, 176)',
  'rgb(103, 58, 183)',
]

function allCountriesQueryOptions(seriesCode: string) {
  return {
    queryKey: ['all-countries-series', seriesCode],
    queryFn: async (): Promise<CountryYearValue[]> => {
      // Fetch _index.csv to find countries with this series
      const indexResponse = await fetch(getDataFileUrl('_index.csv'))
      const indexText = await indexResponse.text()
      const countryCodes = indexText
        .trim()
        .split('\n')
        .slice(1)
        .map(line => {
          const [code, series] = line.split(',').map(v => v.trim().replace(/"/g, ''))
          return { code, series }
        })
        .filter(
          entry => entry.series.toUpperCase() === seriesCode.toUpperCase()
        )
        .map(entry => entry.code)

      // Fetch country names
      const countriesResponse = await fetch(getDataFileUrl('_countries.csv'))
      const countriesText = await countriesResponse.text()
      const countryMap = new Map<string, string>()
      countriesText
        .trim()
        .split('\n')
        .slice(1)
        .forEach(line => {
          const [code, name] = line.split(',').map(v => v.trim().replace(/"/g, ''))
          if (code && name && code !== 'Last Updated:') countryMap.set(code, name)
        })

      // Fetch in batches of 20
      const results: CountryYearValue[] = []
      const batchSize = 20
      for (let i = 0; i < countryCodes.length; i += batchSize) {
        const batch = countryCodes.slice(i, i + batchSize)
        const batchResults = await Promise.all(
          batch.map(async countryCode => {
            try {
              const filename = getFilenameFromCodes(countryCode, seriesCode)
              const response = await fetch(getDataFileUrl(filename))
              if (!response.ok) return []
              const csvText = await response.text()
              return csvText
                .trim()
                .split('\n')
                .slice(1)
                .map(line => {
                  const [year, value] = line.split(',').map(v => v.trim().replace(/"/g, ''))
                  return {
                    countryCode,
                    countryName: countryMap.get(countryCode) || countryCode,
                    year: parseInt(year),
                    value: value === '' || value === '..' ? null : parseFloat(value),
                  }
                })
                .filter(item => !isNaN(item.year)) as CountryYearValue[]
            } catch {
              return []
            }
          })
        )
        results.push(...batchResults.flat())
      }
      return results
    },
    enabled: !!seriesCode,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  }
}

interface SimilarityResult {
  countryCode: string
  countryName: string
  values: Record<string, number>
  distance: number
  similarity: number
}

export function SimilarityRanking() {
  const [referenceCountry, setReferenceCountry] = useState('NLD')
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([
    'NY.GDP.PCAP.PP.KD',
  ])
  const [pendingIndicator, setPendingIndicator] = useState('')
  const [year, setYear] = useState(2023)

  const { data: countries, isLoading: countriesLoading, error: countriesError } = useCountries()
  const { data: seriesList, isLoading: seriesLoading, error: seriesError } = useSeries()

  const countryOptions = useMemo(
    () => (countries ?? []).map(c => ({ value: c.code, label: c.name })),
    [countries]
  )

  const seriesOptions = useMemo(
    () => (seriesList ?? []).map(s => ({ value: s.code, label: s.name })),
    [seriesList]
  )

  const indicatorResults = useQueries({
    queries: selectedIndicators.map(code => allCountriesQueryOptions(code)),
  })

  const indicatorQueries = selectedIndicators.map((code, i) => ({
    code,
    data: indicatorResults[i].data,
    isLoading: indicatorResults[i].isLoading,
  }))

  const isAnyLoading = indicatorQueries.some(q => q.isLoading)

  const { referenceEntry, topSimilar } = useMemo(() => {
    if (isAnyLoading || indicatorQueries.some(q => !q.data)) {
      return { referenceEntry: null, topSimilar: [] }
    }

    // Build country → indicator → value map for the selected year
    const countryIndicatorMap = new Map<string, Record<string, number>>()

    for (const { code, data } of indicatorQueries) {
      if (!data) continue
      for (const entry of data) {
        if (entry.year !== year || entry.value === null) continue
        const value = entry.value as number
        if (!countryIndicatorMap.has(entry.countryCode)) {
          countryIndicatorMap.set(entry.countryCode, {})
        }
        countryIndicatorMap.get(entry.countryCode)![code] = value
      }
    }

    // Filter to countries with ALL indicators present
    const completeCountries: { code: string; name: string; values: Record<string, number> }[] = []
    for (const [code, values] of Array.from(countryIndicatorMap.entries())) {
      if (selectedIndicators.every(ind => ind in values)) {
        // Get country name from data
        const firstIndicatorData = indicatorQueries[0]?.data
        const nameEntry = firstIndicatorData?.find(e => e.countryCode === code)
        completeCountries.push({
          code,
          name: nameEntry?.countryName ?? code,
          values,
        })
      }
    }

    if (completeCountries.length < 2) {
      return { referenceEntry: null, topSimilar: [] }
    }

    // Z-score normalize each indicator across all complete countries
    const normalizedMap = new Map<string, Record<string, number>>()
    for (const indicator of selectedIndicators) {
      const rawValues = completeCountries.map(c => c.values[indicator])
      const normalized = zScoreNormalize(rawValues)
      completeCountries.forEach((c, i) => {
        if (!normalizedMap.has(c.code)) normalizedMap.set(c.code, {})
        normalizedMap.get(c.code)![indicator] = normalized[i]
      })
    }

    // Find reference country
    const refEntry = completeCountries.find(c => c.code === referenceCountry)
    if (!refEntry) {
      return { referenceEntry: null, topSimilar: [] }
    }

    const refNormalized = selectedIndicators.map(ind => normalizedMap.get(refEntry.code)![ind])

    // Compute Euclidean distance from reference for each country, sort
    const results: SimilarityResult[] = completeCountries
      .filter(c => c.code !== referenceCountry)
      .map(c => {
        const cNormalized = selectedIndicators.map(ind => normalizedMap.get(c.code)![ind])
        const dist = euclideanDistance(refNormalized, cNormalized)
        return {
          countryCode: c.code,
          countryName: c.name,
          values: c.values,
          distance: dist,
          similarity: similarityScore(dist),
        }
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10)

    return {
      referenceEntry: {
        countryCode: refEntry.code,
        countryName: refEntry.name,
        values: refEntry.values,
      },
      topSimilar: results,
    }
  }, [indicatorQueries, isAnyLoading, year, referenceCountry, selectedIndicators])

  function handleAddIndicator() {
    if (pendingIndicator && !selectedIndicators.includes(pendingIndicator)) {
      setSelectedIndicators(prev => [...prev, pendingIndicator])
      setPendingIndicator('')
    }
  }

  function handleRemoveIndicator(code: string) {
    setSelectedIndicators(prev => prev.filter(c => c !== code))
  }

  function getSeriesLabel(code: string) {
    return seriesList?.find(s => s.code === code)?.name ?? code
  }

  function getCountryLabel(code: string) {
    return countries?.find(c => c.code === code)?.name ?? code
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reference Country */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Reference Country</label>
          {countriesLoading ? (
            <div className="text-sm text-muted-foreground">Loading countries...</div>
          ) : countriesError ? (
            <div className="text-sm text-red-600">Error loading countries</div>
          ) : (
            <select
              value={referenceCountry}
              onChange={e => setReferenceCountry(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {countryOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Year */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Year</label>
          <input
            type="number"
            value={year}
            min={1960}
            max={2024}
            onChange={e => setYear(Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Indicators */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Indicators</label>
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <SeriesSelect
              seriesOptions={seriesOptions}
              selectedSeries={pendingIndicator}
              onSelectionChange={setPendingIndicator}
              isLoading={seriesLoading}
              error={seriesError}
            />
          </div>
          <button
            onClick={handleAddIndicator}
            disabled={!pendingIndicator || selectedIndicators.includes(pendingIndicator)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>

        {/* Selected indicator chips */}
        {selectedIndicators.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedIndicators.map(code => (
              <span
                key={code}
                className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium"
                title={getSeriesLabel(code)}
              >
                <span className="max-w-[200px] truncate">{getSeriesLabel(code)}</span>
                <button
                  onClick={() => handleRemoveIndicator(code)}
                  className="ml-1 rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors leading-none"
                  aria-label={`Remove ${code}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {isAnyLoading && (
        <div className="text-sm text-muted-foreground p-4 rounded-lg border border-dashed text-center">
          Loading indicator data for all countries...
        </div>
      )}

      {/* No data */}
      {!isAnyLoading && !referenceEntry && selectedIndicators.length > 0 && (
        <div className="text-sm text-muted-foreground p-4 rounded-lg border border-dashed text-center">
          No complete data found for the reference country and all selected indicators in {year}.
          Try a different year or fewer indicators.
        </div>
      )}

      {/* Results */}
      {!isAnyLoading && referenceEntry && (
        <div className="space-y-4">
          {/* Reference Country Card */}
          <Card className="border-2 border-blue-400 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Reference
                </span>
              </div>
              <div className="font-semibold text-base">
                {referenceEntry.countryName}{' '}
                <span className="text-muted-foreground font-normal text-sm">
                  ({referenceEntry.countryCode})
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {selectedIndicators.map(ind => (
                  <div key={ind} className="text-sm flex justify-between gap-4">
                    <span className="text-muted-foreground truncate max-w-[300px]">
                      {getSeriesLabel(ind)}
                    </span>
                    <span className="font-medium tabular-nums">
                      {referenceEntry.values[ind] != null
                        ? referenceEntry.values[ind].toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        : 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top 10 Similar Countries */}
          {topSimilar.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 rounded-lg border border-dashed text-center">
              Not enough countries with complete data to compute similarity.
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Most similar countries in {year}</p>
              {topSimilar.map((result, index) => {
                const rankColor = RANK_COLORS[index] ?? RANK_COLORS[RANK_COLORS.length - 1]
                return (
                  <Card key={result.countryCode}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        {/* Rank badge */}
                        <div
                          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: rankColor }}
                        >
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">
                            {result.countryName}{' '}
                            <span className="text-muted-foreground font-normal">
                              ({result.countryCode})
                            </span>
                          </div>

                          {/* Indicator values */}
                          <div className="mt-1 space-y-0.5">
                            {selectedIndicators.map(ind => (
                              <div key={ind} className="text-xs flex justify-between gap-4">
                                <span className="text-muted-foreground truncate max-w-[280px]">
                                  {getSeriesLabel(ind)}
                                </span>
                                <span className="tabular-nums">
                                  {result.values[ind] != null
                                    ? result.values[ind].toLocaleString(undefined, {
                                        maximumFractionDigits: 2,
                                      })
                                    : 'N/A'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Similarity score */}
                        <div className="flex-shrink-0 text-right w-24">
                          <div className="text-sm font-semibold tabular-nums">
                            {result.similarity.toFixed(1)}%
                          </div>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(result.similarity, 100)}%`,
                                backgroundColor: rankColor,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Note about reference country not in results */}
      {!isAnyLoading && referenceEntry && topSimilar.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Similarity is computed using z-score normalized Euclidean distance across{' '}
          {selectedIndicators.length} indicator{selectedIndicators.length !== 1 ? 's' : ''}.
          Reference: {getCountryLabel(referenceCountry)}.
        </p>
      )}
    </div>
  )
}
