import { useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { SeriesSelect } from '@/components/SeriesSelect'
import { StatsCard } from '@/components/analysis/StatsCard'
import { useCountries, useSeries, useCountrySeriesData } from '@/lib/hooks/use-worldbank-data'
import { linearRegression, polynomialRegression, exponentialRegression, holtSmoothing } from '@/lib/statistics'
import { ScaleToggle, type ScaleType } from '@/components/ui/scale-toggle'

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const COLOR_A = 'rgb(255, 99, 132)'
const COLOR_B = 'rgb(54, 162, 235)'
const COLOR_PREDICTION = 'rgb(76, 175, 80)'
const COLOR_ACTUAL = 'rgb(156, 163, 175)'

const formatValue = (v: number) => {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}k`
  return v.toFixed(1)
}

interface PeriodStats {
  slope: number
  rSquared: number
  growthRate: number
  startValue: number
  endValue: number
}

function computePeriodStats(
  data: { year: number; value: number | null }[],
  startYear: number,
  endYear: number
): PeriodStats | null {
  const filtered = data.filter(
    d => d.value !== null && d.year >= startYear && d.year <= endYear
  ) as { year: number; value: number }[]

  if (filtered.length < 3) return null

  const xs = filtered.map(d => d.year)
  const ys = filtered.map(d => d.value)

  let regression
  try {
    regression = linearRegression(xs, ys)
  } catch {
    return null
  }

  const { slope, rSquared } = regression

  const startValue = ys[0]
  const endValue = ys[ys.length - 1]
  const years = xs[xs.length - 1] - xs[0]

  const growthRate =
    years > 0 && startValue !== 0 && startValue > 0 && endValue > 0
      ? ((endValue / startValue) ** (1 / years) - 1) * 100
      : 0

  return { slope, rSquared, growthRate, startValue, endValue }
}

export function TrendAnalysis() {
  const [selectedCountry, setSelectedCountry] = useState('NLD')
  const [selectedSeries, setSelectedSeries] = useState('NY.GDP.PCAP.PP.KD')
  const [periodAStart, setPeriodAStart] = useState(1990)
  const [periodAEnd, setPeriodAEnd] = useState(2005)
  const [periodBStart, setPeriodBStart] = useState(2005)
  const [periodBEnd, setPeriodBEnd] = useState(2023)
  const [yScaleType, setYScaleType] = useState<ScaleType>('linear')
  const [predictYears, setPredictYears] = useState(0)
  const [predictionMode, setPredictionMode] = useState<'linear' | 'quadratic' | 'cubic' | 'exponential' | 'holt'>('quadratic')

  const { data: countries, isLoading: countriesLoading } = useCountries()
  const { data: seriesList, isLoading: seriesLoading, error: seriesError } = useSeries()

  const { data: rawData, isLoading: dataLoading } = useCountrySeriesData(
    selectedCountry,
    selectedSeries
  )

  const countryOptions = useMemo(
    () => (countries ?? []).map(c => ({ value: c.code, label: c.name })),
    [countries]
  )

  const seriesOptions = useMemo(
    () => (seriesList ?? []).map(s => ({ value: s.code, label: s.name })),
    [seriesList]
  )

  const countryName = useMemo(() => {
    const found = countries?.find(c => c.code === selectedCountry)
    return found ? found.name : selectedCountry
  }, [countries, selectedCountry])

  const seriesName = useMemo(() => {
    const found = seriesList?.find(s => s.code === selectedSeries)
    return found ? found.name : selectedSeries
  }, [seriesList, selectedSeries])

  const statsA = useMemo(
    () => (rawData ? computePeriodStats(rawData, periodAStart, periodAEnd) : null),
    [rawData, periodAStart, periodAEnd]
  )

  const statsB = useMemo(
    () => (rawData ? computePeriodStats(rawData, periodBStart, periodBEnd) : null),
    [rawData, periodBStart, periodBEnd]
  )

  const chartData = useMemo(() => {
    if (!rawData || rawData.length === 0) return null

    // Compute regression lines for period A and B
    const filteredA = rawData.filter(
      d => d.value !== null && d.year >= periodAStart && d.year <= periodAEnd
    ) as { year: number; value: number }[]

    const filteredB = rawData.filter(
      d => d.value !== null && d.year >= periodBStart && d.year <= periodBEnd
    ) as { year: number; value: number }[]

    let regrA: ReturnType<typeof linearRegression> | null = null
    let regrB: ReturnType<typeof linearRegression> | null = null

    if (filteredA.length >= 3) {
      try {
        regrA = linearRegression(
          filteredA.map(d => d.year),
          filteredA.map(d => d.value)
        )
      } catch {
        regrA = null
      }
    }

    if (filteredB.length >= 3) {
      try {
        regrB = linearRegression(
          filteredB.map(d => d.year),
          filteredB.map(d => d.value)
        )
      } catch {
        regrB = null
      }
    }

    const allYears = rawData.map(d => d.year)
    const labels = allYears.map(String)

    const actualValues = rawData.map(d => (d.value !== null ? d.value : null))

    const trendA = rawData.map(d => {
      if (regrA && d.year >= periodAStart && d.year <= periodAEnd) {
        return regrA.slope * d.year + regrA.intercept
      }
      return null
    })

    const trendB = rawData.map(d => {
      if (regrB && d.year >= periodBStart && d.year <= periodBEnd) {
        return regrB.slope * d.year + regrB.intercept
      }
      return null
    })

    // Add prediction years if requested
    const lastYear = allYears[allYears.length - 1]
    const predictionLabels: string[] = []
    const predictionValues: (number | null)[] = []

    if (predictYears > 0 && filteredB.length >= 3) {
      const bXs = filteredB.map(d => d.year)
      const bYs = filteredB.map(d => d.value)

      let predictFn: (x: number) => number
      try {
        if (predictionMode === 'exponential') {
          const expResult = exponentialRegression(bXs, bYs)
          predictFn = expResult.predict
        } else if (predictionMode === 'holt') {
          const holtResult = holtSmoothing(bYs)
          const lastBYear = bXs[bXs.length - 1]
          predictFn = (x: number) => holtResult.predict(x - lastBYear)
        } else if (predictionMode === 'linear' && regrB) {
          predictFn = (x: number) => regrB!.slope * x + regrB!.intercept
        } else {
          const degree = predictionMode === 'cubic' ? 3 : 2
          const polyResult = polynomialRegression(bXs, bYs, Math.min(degree, filteredB.length - 1))
          predictFn = polyResult.predict
        }
      } catch {
        predictFn = regrB ? (x: number) => regrB!.slope * x + regrB!.intercept : (_x: number) => 0
      }

      // Fill nulls for existing years
      for (let i = 0; i < allYears.length; i++) {
        predictionValues.push(null)
      }
      // Connect prediction to last actual data point
      const lastActual = rawData.find(d => d.year === lastYear)
      if (lastActual?.value != null) {
        predictionValues[predictionValues.length - 1] = lastActual.value
      }
      for (let y = 1; y <= predictYears; y++) {
        const futureYear = lastYear + y
        predictionLabels.push(String(futureYear))
        predictionValues.push(predictFn(futureYear))
      }
      // Add nulls for actual/trendA/trendB to match extended labels
      for (let i = 0; i < predictYears; i++) {
        actualValues.push(null)
        trendA.push(null)
        trendB.push(null)
      }
    }

    return {
      labels: [...labels, ...predictionLabels],
      datasets: [
        {
          label: 'Actual',
          data: actualValues,
          borderColor: COLOR_ACTUAL,
          backgroundColor: COLOR_ACTUAL,
          pointRadius: 3,
          tension: 0.1,
          borderDash: [],
          spanGaps: false,
        },
        {
          label: `Period A trend (${periodAStart}–${periodAEnd})`,
          data: trendA,
          borderColor: COLOR_A,
          backgroundColor: 'transparent',
          pointRadius: 0,
          tension: 0,
          borderDash: [6, 3],
          spanGaps: false,
        },
        {
          label: `Period B trend (${periodBStart}–${periodBEnd})`,
          data: trendB,
          borderColor: COLOR_B,
          backgroundColor: 'transparent',
          pointRadius: 0,
          tension: 0,
          borderDash: [6, 3],
          spanGaps: false,
        },
        ...(predictYears > 0 && predictionValues.length > 0
          ? [
              {
                label: `Prediction — ${predictionMode} (${lastYear + 1}–${lastYear + predictYears})`,
                data: predictionValues,
                borderColor: COLOR_PREDICTION,
                backgroundColor: COLOR_PREDICTION + '20',
                pointRadius: 3,
                tension: predictionMode === 'linear' ? 0 : 0.3,
                borderDash: [4, 4],
                spanGaps: true,
                fill: false,
              },
            ]
          : []),
      ],
    }
  }, [rawData, periodAStart, periodAEnd, periodBStart, periodBEnd, predictYears, predictionMode])

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' as const },
        title: {
          display: true,
          text: `${seriesName} — ${countryName}`,
        },
      },
      scales: {
        x: { ticks: { maxTicksLimit: 12 } },
        y: { type: yScaleType },
      },
    }),
    [seriesName, countryName, yScaleType]
  )

  const insufficientA = rawData
    ? rawData.filter(d => d.value !== null && d.year >= periodAStart && d.year <= periodAEnd)
        .length < 3
    : false

  const insufficientB = rawData
    ? rawData.filter(d => d.value !== null && d.year >= periodBStart && d.year <= periodBEnd)
        .length < 3
    : false

  return (
    <div className="space-y-4">
      {/* Controls: country + series */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Country</label>
          <select
            value={selectedCountry}
            onChange={e => setSelectedCountry(e.target.value)}
            disabled={countriesLoading}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {countryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Series</label>
          <SeriesSelect
            seriesOptions={seriesOptions}
            selectedSeries={selectedSeries}
            onSelectionChange={setSelectedSeries}
            isLoading={seriesLoading}
            error={seriesError}
          />
        </div>
      </div>

      {/* Period selectors + options */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color: COLOR_A }}
          >
            Period A:
          </span>
          <input
            type="number"
            value={periodAStart}
            min={1960}
            max={periodAEnd}
            onChange={e => setPeriodAStart(Number(e.target.value))}
            className="w-24 rounded-md border px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1"
            style={{ borderColor: COLOR_A, outlineColor: COLOR_A }}
          />
          <span className="text-sm text-muted-foreground">—</span>
          <input
            type="number"
            value={periodAEnd}
            min={periodAStart}
            max={2024}
            onChange={e => setPeriodAEnd(Number(e.target.value))}
            className="w-24 rounded-md border px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1"
            style={{ borderColor: COLOR_A, outlineColor: COLOR_A }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color: COLOR_B }}
          >
            Period B:
          </span>
          <input
            type="number"
            value={periodBStart}
            min={1960}
            max={periodBEnd}
            onChange={e => setPeriodBStart(Number(e.target.value))}
            className="w-24 rounded-md border px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1"
            style={{ borderColor: COLOR_B, outlineColor: COLOR_B }}
          />
          <span className="text-sm text-muted-foreground">—</span>
          <input
            type="number"
            value={periodBEnd}
            min={periodBStart}
            max={2024}
            onChange={e => setPeriodBEnd(Number(e.target.value))}
            className="w-24 rounded-md border px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1"
            style={{ borderColor: COLOR_B, outlineColor: COLOR_B }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: COLOR_PREDICTION }}>Predict:</span>
          <input
            type="number"
            value={predictYears}
            min={0}
            max={50}
            onChange={e => setPredictYears(Math.max(0, Number(e.target.value)))}
            className="w-20 rounded-md border px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1"
            style={{ borderColor: COLOR_PREDICTION, outlineColor: COLOR_PREDICTION }}
          />
          <span className="text-xs text-muted-foreground">years</span>
          <select
            value={predictionMode}
            onChange={e => setPredictionMode(e.target.value as typeof predictionMode)}
            className="text-xs rounded border border-input bg-background px-2 py-1"
            style={{ borderColor: COLOR_PREDICTION }}
          >
            <option value="linear">Linear</option>
            <option value="quadratic">Quadratic</option>
            <option value="cubic">Cubic</option>
            <option value="exponential">Exponential</option>
            <option value="holt">Holt smoothing</option>
          </select>
        </div>
        <ScaleToggle value={yScaleType} onChange={setYScaleType} />
      </div>

      {/* Loading */}
      {dataLoading && (
        <div className="text-sm text-muted-foreground p-4 rounded-lg border border-dashed text-center">
          Loading data...
        </div>
      )}

      {/* Chart + Stats */}
      {!dataLoading && chartData && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Line Chart */}
          <div className="flex-[2] min-h-[400px]">
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* Stats Panel */}
          <div className="flex-1 space-y-4">
            {(insufficientA || insufficientB) && (
              <div className="text-sm text-amber-600 p-3 rounded-lg border border-amber-200 bg-amber-50">
                {insufficientA && (
                  <div>Period A: not enough data points (need ≥ 3).</div>
                )}
                {insufficientB && (
                  <div>Period B: not enough data points (need ≥ 3).</div>
                )}
              </div>
            )}

            {statsA ? (
              <StatsCard
                title={`Period A (${periodAStart}–${periodAEnd})`}
                accentColor={COLOR_A}
                stats={[
                  { label: 'Growth rate', value: `${statsA.growthRate.toFixed(2)}%/yr` },
                  { label: 'Slope', value: `${statsA.slope.toFixed(2)}/yr` },
                  { label: 'R²', value: statsA.rSquared.toFixed(4) },
                  {
                    label: 'Start → End',
                    value: `${formatValue(statsA.startValue)} → ${formatValue(statsA.endValue)}`,
                  },
                ]}
              />
            ) : (
              <StatsCard
                title={`Period A (${periodAStart}–${periodAEnd})`}
                accentColor={COLOR_A}
                stats={[{ label: 'Status', value: 'Insufficient data' }]}
              />
            )}

            {statsB ? (
              <StatsCard
                title={`Period B (${periodBStart}–${periodBEnd})`}
                accentColor={COLOR_B}
                stats={[
                  { label: 'Growth rate', value: `${statsB.growthRate.toFixed(2)}%/yr` },
                  { label: 'Slope', value: `${statsB.slope.toFixed(2)}/yr` },
                  { label: 'R²', value: statsB.rSquared.toFixed(4) },
                  {
                    label: 'Start → End',
                    value: `${formatValue(statsB.startValue)} → ${formatValue(statsB.endValue)}`,
                  },
                ]}
              />
            ) : (
              <StatsCard
                title={`Period B (${periodBStart}–${periodBEnd})`}
                accentColor={COLOR_B}
                stats={[{ label: 'Status', value: 'Insufficient data' }]}
              />
            )}

            {statsA && statsB && (
              <StatsCard
                title="Comparison (A → B)"
                stats={[
                  {
                    label: 'Growth change',
                    value: `${(statsB.growthRate - statsA.growthRate).toFixed(2)} pp/yr`,
                  },
                  {
                    label: 'Slope change',
                    value:
                      statsA.slope !== 0
                        ? `${(((statsB.slope - statsA.slope) / Math.abs(statsA.slope)) * 100).toFixed(1)}%`
                        : 'N/A',
                  },
                ]}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
