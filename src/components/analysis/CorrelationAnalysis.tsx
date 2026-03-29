import { useMemo, useState } from 'react'
import { SeriesSelect } from '@/components/SeriesSelect'
import { CountrySelect } from '@/components/CountrySelect'
import { ScatterChart } from '@/components/charts/ScatterChart'
import type { ScatterDataset } from '@/components/charts/ScatterChart'
import { StatsCard } from '@/components/analysis/StatsCard'
import type { StatEntry } from '@/components/analysis/StatsCard'
import { useCountries, useSeries } from '@/lib/hooks/use-worldbank-data'
import { useMultiSeriesData } from '@/lib/hooks/use-multi-series-data'
import { pearsonCorrelation, linearRegression } from '@/lib/statistics'
import { DATA_EXPLORER_CONFIG } from '@/lib/config'
import { ScaleToggle, type ScaleType } from '@/components/ui/scale-toggle'
import { ArrowLeftRight } from 'lucide-react'

export function CorrelationAnalysis() {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([
    ...DATA_EXPLORER_CONFIG.defaultCountries,
  ])
  const [seriesX, setSeriesX] = useState('NY.GDP.PCAP.PP.KD')
  const [seriesY, setSeriesY] = useState('EN.ATM.CO2E.PC')
  const [yearStart, setYearStart] = useState(1990)
  const [yearEnd, setYearEnd] = useState(2023)
  const [xScaleType, setXScaleType] = useState<ScaleType>('linear')
  const [yScale, setYScale] = useState<ScaleType>('linear')

  const handleSwapAxes = () => {
    setSeriesX(seriesY)
    setSeriesY(seriesX)
  }

  const { data: countries, isLoading: countriesLoading, error: countriesError } = useCountries()
  const { data: seriesList, isLoading: seriesLoading, error: seriesError } = useSeries()

  const seriesCodes = useMemo(() => {
    if (!seriesX || !seriesY) return []
    return [seriesX, seriesY]
  }, [seriesX, seriesY])

  const {
    data: multiSeriesData,
    isLoading: dataLoading,
  } = useMultiSeriesData(seriesCodes, selectedCountries)

  const countryOptions = useMemo(
    () => (countries ?? []).map(c => ({ value: c.code, label: c.name })),
    [countries]
  )

  const seriesOptions = useMemo(
    () => (seriesList ?? []).map(s => ({ value: s.code, label: s.name })),
    [seriesList]
  )

  const xSeriesLabel = useMemo(() => {
    const found = seriesList?.find(s => s.code === seriesX)
    return found ? found.name : seriesX
  }, [seriesList, seriesX])

  const ySeriesLabel = useMemo(() => {
    const found = seriesList?.find(s => s.code === seriesY)
    return found ? found.name : seriesY
  }, [seriesList, seriesY])

  const { scatterDatasets, allXValues, allYValues, perCountryStats } = useMemo(() => {
    const scatterDatasets: ScatterDataset[] = []
    const allXValues: number[] = []
    const allYValues: number[] = []
    const perCountryStats: { country: string; r: number | null }[] = []

    if (!multiSeriesData || multiSeriesData.length < 2) {
      return { scatterDatasets, allXValues, allYValues, perCountryStats }
    }

    const xSeriesData = multiSeriesData.find(e => e.seriesCode === seriesX)
    const ySeriesData = multiSeriesData.find(e => e.seriesCode === seriesY)

    if (!xSeriesData || !ySeriesData) {
      return { scatterDatasets, allXValues, allYValues, perCountryStats }
    }

    for (const countryCode of selectedCountries) {
      const xCountry = xSeriesData.countries.find(c => c.country.code === countryCode)
      const yCountry = ySeriesData.countries.find(c => c.country.code === countryCode)

      if (!xCountry || !yCountry) continue

      const countryName = xCountry.country.name

      const xByYear = new Map<number, number>()
      for (const { year, value } of xCountry.data) {
        if (value !== null && year >= yearStart && year <= yearEnd) {
          xByYear.set(year, value)
        }
      }

      const points: { x: number; y: number }[] = []
      const cxValues: number[] = []
      const cyValues: number[] = []

      for (const { year, value } of yCountry.data) {
        if (value !== null && year >= yearStart && year <= yearEnd && xByYear.has(year)) {
          const xVal = xByYear.get(year)!
          points.push({ x: xVal, y: value })
          cxValues.push(xVal)
          cyValues.push(value)
          allXValues.push(xVal)
          allYValues.push(value)
        }
      }

      if (points.length > 0) {
        scatterDatasets.push({ label: countryName, points })
      }

      let countryR: number | null = null
      if (cxValues.length >= 3) {
        try {
          const result = pearsonCorrelation(cxValues, cyValues)
          countryR = result.r
        } catch {
          // not enough data
        }
      }
      perCountryStats.push({ country: countryName, r: countryR })
    }

    return { scatterDatasets, allXValues, allYValues, perCountryStats }
  }, [multiSeriesData, seriesX, seriesY, selectedCountries, yearStart, yearEnd])

  const overallStats = useMemo(() => {
    if (allXValues.length < 5) return null
    try {
      const corr = pearsonCorrelation(allXValues, allYValues)
      const reg = linearRegression(allXValues, allYValues)
      return { corr, reg }
    } catch {
      return null
    }
  }, [allXValues, allYValues])

  const trendLine = useMemo(() => {
    if (!overallStats || allXValues.length === 0) return undefined
    let xMin = Infinity
    let xMax = -Infinity
    for (const v of allXValues) {
      if (v < xMin) xMin = v
      if (v > xMax) xMax = v
    }
    return {
      slope: overallStats.reg.slope,
      intercept: overallStats.reg.intercept,
      xMin,
      xMax,
    }
  }, [overallStats, allXValues])

  const overallStatsEntries: StatEntry[] = useMemo(() => {
    if (!overallStats) return []
    const { corr } = overallStats
    return [
      { label: 'Pearson R', value: corr.r.toFixed(4) },
      { label: 'R²', value: corr.rSquared.toFixed(4) },
      { label: 'p-value', value: corr.pValue <= 0.001 ? '<0.001' : corr.pValue.toFixed(3) },
      { label: 'N (data points)', value: corr.n },
    ]
  }, [overallStats])

  const perCountryEntries: StatEntry[] = useMemo(() => {
    return perCountryStats
      .filter(s => s.r !== null)
      .map(s => ({
        label: s.country,
        value: s.r!.toFixed(4),
      }))
  }, [perCountryStats])

  const isLoading = dataLoading && seriesCodes.length > 0

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr] gap-4 items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium">X-Axis Series</label>
          <SeriesSelect
            seriesOptions={seriesOptions}
            selectedSeries={seriesX}
            onSelectionChange={setSeriesX}
            isLoading={seriesLoading}
            error={seriesError}
          />
        </div>
        <button
          type="button"
          onClick={handleSwapAxes}
          className="mb-1 p-2 rounded-md border border-input bg-background hover:bg-accent cursor-pointer transition-colors"
          title="Swap X and Y axes"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="space-y-1">
          <label className="text-sm font-medium">Y-Axis Series</label>
          <SeriesSelect
            seriesOptions={seriesOptions}
            selectedSeries={seriesY}
            onSelectionChange={setSeriesY}
            isLoading={seriesLoading}
            error={seriesError}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Countries</label>
          <CountrySelect
            countryOptions={countryOptions}
            selectedCountries={selectedCountries}
            onSelectionChange={setSelectedCountries}
            isLoading={countriesLoading}
            error={countriesError}
          />
        </div>
      </div>

      {/* Year Range + Scale Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="number"
          value={yearStart}
          min={1960}
          max={yearEnd}
          onChange={e => setYearStart(Number(e.target.value))}
          className="w-24 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <span className="text-sm text-muted-foreground">—</span>
        <input
          type="number"
          value={yearEnd}
          min={yearStart}
          max={2024}
          onChange={e => setYearEnd(Number(e.target.value))}
          className="w-24 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="ml-auto flex gap-3">
          <ScaleToggle label="X Scale" value={xScaleType} onChange={setXScaleType} />
          <ScaleToggle label="Y Scale" value={yScale} onChange={setYScale} />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-sm text-muted-foreground p-4 rounded-lg border border-dashed text-center">
          Loading data...
        </div>
      )}

      {/* No data state */}
      {!isLoading && scatterDatasets.length === 0 && seriesCodes.length === 2 && (
        <div className="text-sm text-muted-foreground p-4 rounded-lg border border-dashed text-center">
          No overlapping data found for the selected countries, series, and year range.
        </div>
      )}

      {/* Chart + Stats */}
      {!isLoading && scatterDatasets.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Scatter Chart */}
          <div className="flex-[2] min-h-[400px]">
            <ScatterChart
              datasets={scatterDatasets}
              xLabel={xSeriesLabel}
              yLabel={ySeriesLabel}
              title={`${xSeriesLabel} vs ${ySeriesLabel}`}
              trendLine={trendLine}
              xScaleType={xScaleType}
              yScaleType={yScale}
            />
          </div>

          {/* Stats Panel */}
          <div className="flex-1 space-y-4">
            {allXValues.length < 5 && (
              <div className="text-sm text-amber-600 p-3 rounded-lg border border-amber-200 bg-amber-50">
                Warning: fewer than 5 data points overall — correlation statistics may be unreliable.
              </div>
            )}

            {overallStats && (
              <StatsCard title="Overall Correlation" stats={overallStatsEntries} />
            )}

            {perCountryEntries.length > 0 && (
              <StatsCard title="Per-Country Pearson R" stats={perCountryEntries} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
