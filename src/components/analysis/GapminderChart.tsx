import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  LinearScale,
  LogarithmicScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bubble } from 'react-chartjs-2'
import { useCountries, useSeries } from '@/lib/hooks/use-worldbank-data'
import { useMultiSeriesData } from '@/lib/hooks/use-multi-series-data'
import { SeriesSelect } from '@/components/SeriesSelect'
import { CountrySelect } from '@/components/CountrySelect'
import { ScaleToggle, type ScaleType } from '@/components/ui/scale-toggle'
import { DATA_EXPLORER_CONFIG } from '@/lib/config'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'

ChartJS.register(LinearScale, LogarithmicScale, PointElement, Tooltip, Legend)

const COLORS = [
  'rgb(255, 99, 132)',
  'rgb(54, 162, 235)',
  'rgb(255, 205, 86)',
  'rgb(75, 192, 192)',
  'rgb(153, 102, 255)',
  'rgb(255, 159, 64)',
  'rgb(199, 199, 199)',
  'rgb(83, 102, 147)',
  'rgb(255, 0, 255)',
  'rgb(0, 200, 83)',
  'rgb(255, 127, 80)',
  'rgb(100, 149, 237)',
]

export function GapminderChart() {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([
    ...DATA_EXPLORER_CONFIG.defaultCountries,
  ])
  const [seriesX, setSeriesX] = useState('NY.GDP.PCAP.PP.KD')
  const [seriesY, setSeriesY] = useState('SP.DYN.LE00.IN')
  const [seriesZ, setSeriesZ] = useState('SP.POP.TOTL')
  const [xScaleType, setXScaleType] = useState<ScaleType>('logarithmic')
  const [yScaleType, setYScaleType] = useState<ScaleType>('linear')
  const [currentYear, setCurrentYear] = useState(1990)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(500)
  const [showTrails, setShowTrails] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: countries, isLoading: countriesLoading, error: countriesError } = useCountries()
  const { data: seriesList, isLoading: seriesLoading, error: seriesError } = useSeries()

  const seriesCodes = useMemo(() => {
    const codes: string[] = []
    if (seriesX) codes.push(seriesX)
    if (seriesY && !codes.includes(seriesY)) codes.push(seriesY)
    if (seriesZ && !codes.includes(seriesZ)) codes.push(seriesZ)
    return codes
  }, [seriesX, seriesY, seriesZ])

  const { data: multiSeriesData, isLoading: dataLoading } = useMultiSeriesData(
    seriesCodes,
    selectedCountries
  )

  const countryOptions = useMemo(
    () => (countries ?? []).map(c => ({ value: c.code, label: c.name })),
    [countries]
  )
  const seriesOptions = useMemo(
    () => (seriesList ?? []).map(s => ({ value: s.code, label: s.name })).sort((a, b) => a.label.localeCompare(b.label)),
    [seriesList]
  )

  // Find all available years across all data
  const availableYears = useMemo(() => {
    if (!multiSeriesData) return []
    const years = new Set<number>()
    for (const entry of multiSeriesData) {
      for (const country of entry.countries) {
        for (const d of country.data) {
          if (d.value !== null) years.add(d.year)
        }
      }
    }
    return Array.from(years).sort((a, b) => a - b)
  }, [multiSeriesData])

  const minYear = availableYears[0] ?? 1960
  const maxYear = availableYears[availableYears.length - 1] ?? 2023

  // Playback logic
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentYear(prev => {
          if (prev >= maxYear) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, speed)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, speed, maxYear])

  const handlePlayPause = useCallback(() => {
    if (currentYear >= maxYear) {
      setCurrentYear(minYear)
      setIsPlaying(true)
    } else {
      setIsPlaying(prev => !prev)
    }
  }, [currentYear, maxYear, minYear])

  const handleStepBack = () => {
    setIsPlaying(false)
    setCurrentYear(prev => Math.max(minYear, prev - 1))
  }

  const handleStepForward = () => {
    setIsPlaying(false)
    setCurrentYear(prev => Math.min(maxYear, prev + 1))
  }

  // Build bubble data for the current year
  const { chartData, chartOptions } = useMemo(() => {
    if (!multiSeriesData || multiSeriesData.length < 2) {
      return { chartData: { datasets: [] }, chartOptions: {} }
    }

    const xData = multiSeriesData.find(e => e.seriesCode === seriesX)
    const yData = multiSeriesData.find(e => e.seriesCode === seriesY)
    const zData = seriesZ ? multiSeriesData.find(e => e.seriesCode === seriesZ) : null

    if (!xData || !yData) return { chartData: { datasets: [] }, chartOptions: {} }

    // Find max Z value for scaling bubble size
    let maxZValue = 1
    if (zData) {
      for (const c of zData.countries) {
        for (const d of c.data) {
          if (d.value !== null && d.value > maxZValue) maxZValue = d.value
        }
      }
    }

    const datasets = selectedCountries.map((code, idx) => {
      const xCountry = xData.countries.find(c => c.country.code === code)
      const yCountry = yData.countries.find(c => c.country.code === code)
      const zCountry = zData?.countries.find(c => c.country.code === code)

      if (!xCountry || !yCountry) return null

      const xVal = xCountry.data.find(d => d.year === currentYear)?.value
      const yVal = yCountry.data.find(d => d.year === currentYear)?.value
      const zVal = zCountry?.data.find(d => d.year === currentYear)?.value

      if (xVal == null || yVal == null) return null

      // Scale bubble radius: sqrt so area is proportional to value
      const baseRadius = zVal != null ? Math.sqrt(zVal / maxZValue) * 30 + 4 : 8

      const color = COLORS[idx % COLORS.length]

      const points: { x: number; y: number; r: number }[] = [{ x: xVal, y: yVal, r: baseRadius }]

      // Add trail points (smaller, more transparent) for past years
      if (showTrails) {
        const trailYears = 5
        for (let offset = 1; offset <= trailYears; offset++) {
          const trailYear = currentYear - offset
          const tx = xCountry.data.find(d => d.year === trailYear)?.value
          const ty = yCountry.data.find(d => d.year === trailYear)?.value
          if (tx != null && ty != null) {
            points.push({ x: tx, y: ty, r: 3 })
          }
        }
      }

      return {
        label: xCountry.country.name,
        data: points,
        backgroundColor: color + '99',
        borderColor: color,
        borderWidth: 2,
        hoverRadius: 2,
      }
    }).filter(Boolean)

    const xSeriesName = seriesList?.find(s => s.code === seriesX)?.name ?? seriesX
    const ySeriesName = seriesList?.find(s => s.code === seriesY)?.name ?? seriesY

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' as const },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const { x, y, r } = ctx.parsed
              const zLabel = seriesZ
                ? `, Size: ${(ctx.raw as any).r > 5 ? Number(((ctx.raw as any).r - 4) ** 2 / 900 * maxZValue).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 'N/A'}`
                : ''
              return `${ctx.dataset.label}: (${x.toLocaleString()}, ${y.toLocaleString()}${zLabel})`
            },
          },
        },
      },
      scales: {
        x: {
          type: xScaleType,
          title: { display: true, text: xSeriesName },
        },
        y: {
          type: yScaleType,
          title: { display: true, text: ySeriesName },
        },
      },
    }

    return { chartData: { datasets: datasets as any }, chartOptions: options }
  }, [multiSeriesData, seriesX, seriesY, seriesZ, seriesList, selectedCountries, currentYear, xScaleType, yScaleType, showTrails])

  const isLoading = dataLoading && seriesCodes.length > 0

  return (
    <div className="space-y-4">
      {/* Series selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">X-Axis Series</label>
          <SeriesSelect seriesOptions={seriesOptions} selectedSeries={seriesX} onSelectionChange={setSeriesX} isLoading={seriesLoading} error={seriesError} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Y-Axis Series</label>
          <SeriesSelect seriesOptions={seriesOptions} selectedSeries={seriesY} onSelectionChange={setSeriesY} isLoading={seriesLoading} error={seriesError} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Bubble Size (optional)</label>
          <SeriesSelect seriesOptions={[{ value: '', label: 'None' }, ...seriesOptions]} selectedSeries={seriesZ} onSelectionChange={setSeriesZ} isLoading={seriesLoading} error={seriesError} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Countries</label>
          <CountrySelect countryOptions={countryOptions} selectedCountries={selectedCountries} onSelectionChange={setSelectedCountries} isLoading={countriesLoading} error={countriesError} />
        </div>
      </div>

      {/* Scale controls */}
      <div className="flex flex-wrap items-center gap-4">
        <ScaleToggle label="X Scale" value={xScaleType} onChange={setXScaleType} />
        <ScaleToggle label="Y Scale" value={yScaleType} onChange={setYScaleType} />
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showTrails}
            onChange={e => setShowTrails(e.target.checked)}
            className="rounded"
          />
          Show trails
        </label>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-sm text-muted-foreground p-4 rounded-lg border border-dashed text-center">
          Loading data...
        </div>
      )}

      {/* Chart */}
      {!isLoading && chartData.datasets.length > 0 && (
        <div className="relative">
          {/* Year display */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8rem] font-bold text-foreground/5 pointer-events-none select-none z-0" style={{ fontFamily: "'Baloo 2', cursive" }}>
            {currentYear}
          </div>

          <div className="min-h-[500px] relative z-10">
            <Bubble data={chartData} options={chartOptions as any} />
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-3 mt-4">
            <button type="button" onClick={handleStepBack} className="p-2 rounded-md border border-input bg-background hover:bg-accent cursor-pointer transition-colors">
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handlePlayPause}
              className="p-2 rounded-md border border-input bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer transition-colors"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button type="button" onClick={handleStepForward} className="p-2 rounded-md border border-input bg-background hover:bg-accent cursor-pointer transition-colors">
              <SkipForward className="h-4 w-4" />
            </button>

            {/* Year slider */}
            <input
              type="range"
              min={minYear}
              max={maxYear}
              value={currentYear}
              onChange={e => { setIsPlaying(false); setCurrentYear(Number(e.target.value)) }}
              className="flex-1 cursor-pointer"
            />
            <span className="text-sm font-bold tabular-nums w-12 text-center">{currentYear}</span>

            {/* Speed control */}
            <div className="flex items-center gap-1 ml-2">
              <span className="text-xs text-muted-foreground">Speed:</span>
              <select
                value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                className="text-xs rounded border border-input bg-background px-1 py-0.5"
              >
                <option value={1000}>0.5x</option>
                <option value={500}>1x</option>
                <option value={250}>2x</option>
                <option value={100}>5x</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* No data */}
      {!isLoading && chartData.datasets.length === 0 && seriesX && seriesY && selectedCountries.length > 0 && (
        <div className="text-sm text-muted-foreground p-4 rounded-lg border border-dashed text-center">
          No data found for year {currentYear}. Try moving the slider or selecting different series.
        </div>
      )}
    </div>
  )
}
