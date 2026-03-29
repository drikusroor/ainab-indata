# Statistical Analysis Tool Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Statistical Analysis view with Correlation, Similarity Ranking, and Trend Analysis sub-tabs alongside the existing DataExplorer.

**Architecture:** New top-level `StatisticalAnalysis` component switched via tabs in `App.tsx`. Three independent analysis sub-components, each with their own state. All stats math in a shared `statistics.ts` utility. Data fetching composes existing hooks.

**Tech Stack:** React 19, TypeScript, Chart.js (scatter), TanStack Query v5, shadcn/ui Tabs, Bun test runner

**Spec:** `docs/superpowers/specs/2026-03-29-statistical-analysis-design.md`

---

### Task 1: Statistics utility — pure math functions

**Files:**
- Create: `src/lib/statistics.ts`
- Create: `src/lib/statistics.test.ts`

This is the foundation — all three analysis tabs depend on these functions. Pure functions, no React, no fetching.

- [ ] **Step 1: Write failing tests for `mean` and `standardDeviation`**

```typescript
// src/lib/statistics.test.ts
import { describe, it, expect } from "bun:test"
import { mean, standardDeviation } from "./statistics"

describe("mean", () => {
  it("computes the arithmetic mean", () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3)
  })
  it("handles single value", () => {
    expect(mean([42])).toBe(42)
  })
  it("returns NaN for empty array", () => {
    expect(mean([])).toBeNaN()
  })
})

describe("standardDeviation", () => {
  it("computes population standard deviation", () => {
    const result = standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])
    expect(result).toBeCloseTo(2.0, 1)
  })
  it("returns 0 for identical values", () => {
    expect(standardDeviation([5, 5, 5])).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/lib/statistics.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `mean` and `standardDeviation`**

```typescript
// src/lib/statistics.ts

export function mean(values: number[]): number {
  if (values.length === 0) return NaN
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function standardDeviation(values: number[]): number {
  if (values.length === 0) return NaN
  const avg = mean(values)
  const squaredDiffs = values.map(v => (v - avg) ** 2)
  return Math.sqrt(mean(squaredDiffs))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/lib/statistics.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing tests for `linearRegression`**

```typescript
describe("linearRegression", () => {
  it("computes slope, intercept, and rSquared for perfect line", () => {
    const xs = [1, 2, 3, 4, 5]
    const ys = [2, 4, 6, 8, 10]
    const result = linearRegression(xs, ys)
    expect(result.slope).toBeCloseTo(2, 5)
    expect(result.intercept).toBeCloseTo(0, 5)
    expect(result.rSquared).toBeCloseTo(1, 5)
  })
  it("returns zero slope for flat data", () => {
    const xs = [1, 2, 3, 4]
    const ys = [5, 5, 5, 5]
    const result = linearRegression(xs, ys)
    expect(result.slope).toBeCloseTo(0, 5)
  })
  it("throws for mismatched lengths", () => {
    expect(() => linearRegression([1, 2], [1])).toThrow()
  })
  it("throws for fewer than 2 points", () => {
    expect(() => linearRegression([1], [1])).toThrow()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `bun test src/lib/statistics.test.ts`
Expected: FAIL — linearRegression not found

- [ ] **Step 7: Implement `linearRegression`**

```typescript
export interface RegressionResult {
  slope: number
  intercept: number
  rSquared: number
}

export function linearRegression(xs: number[], ys: number[]): RegressionResult {
  if (xs.length !== ys.length) throw new Error("Arrays must have equal length")
  if (xs.length < 2) throw new Error("Need at least 2 data points")

  const n = xs.length
  const xMean = mean(xs)
  const yMean = mean(ys)

  let ssXY = 0
  let ssXX = 0
  let ssYY = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xMean
    const dy = ys[i] - yMean
    ssXY += dx * dy
    ssXX += dx * dx
    ssYY += dy * dy
  }

  const slope = ssXX === 0 ? 0 : ssXY / ssXX
  const intercept = yMean - slope * xMean
  const rSquared = ssXX === 0 || ssYY === 0 ? 0 : (ssXY * ssXY) / (ssXX * ssYY)

  return { slope, intercept, rSquared }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `bun test src/lib/statistics.test.ts`
Expected: PASS

- [ ] **Step 9: Write failing tests for `pearsonCorrelation`**

```typescript
describe("pearsonCorrelation", () => {
  it("returns r=1 for perfect positive correlation", () => {
    const result = pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])
    expect(result.r).toBeCloseTo(1, 5)
    expect(result.rSquared).toBeCloseTo(1, 5)
    expect(result.pValue).toBeLessThan(0.05)
    expect(result.n).toBe(5)
  })
  it("returns r=-1 for perfect negative correlation", () => {
    const result = pearsonCorrelation([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])
    expect(result.r).toBeCloseTo(-1, 5)
  })
  it("returns r~0 for uncorrelated data", () => {
    const result = pearsonCorrelation([1, 2, 3, 4, 5], [5, 1, 4, 2, 3])
    expect(Math.abs(result.r)).toBeLessThan(0.5)
  })
  it("throws for fewer than 3 points", () => {
    expect(() => pearsonCorrelation([1, 2], [3, 4])).toThrow()
  })
})
```

- [ ] **Step 10: Run test to verify it fails**

Run: `bun test src/lib/statistics.test.ts`
Expected: FAIL — pearsonCorrelation not found

- [ ] **Step 11: Implement `pearsonCorrelation`**

```typescript
export interface CorrelationResult {
  r: number
  rSquared: number
  pValue: number
  n: number
}

export function pearsonCorrelation(xs: number[], ys: number[]): CorrelationResult {
  if (xs.length !== ys.length) throw new Error("Arrays must have equal length")
  const n = xs.length
  if (n < 3) throw new Error("Need at least 3 data points for correlation")

  const xMean = mean(xs)
  const yMean = mean(ys)

  let ssXY = 0
  let ssXX = 0
  let ssYY = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xMean
    const dy = ys[i] - yMean
    ssXY += dx * dy
    ssXX += dx * dx
    ssYY += dy * dy
  }

  const denom = Math.sqrt(ssXX * ssYY)
  const r = denom === 0 ? 0 : ssXY / denom
  const rSquared = r * r

  // p-value via t-distribution approximation
  const t = Math.abs(r) * Math.sqrt((n - 2) / (1 - rSquared + 1e-10))
  const df = n - 2
  const pValue = approximatePValue(t, df)

  return { r, rSquared, pValue, n }
}

/**
 * Approximate p-value from t-statistic using a simple lookup
 * Returns significance thresholds: < 0.001, < 0.01, < 0.05, or 1.0
 */
function approximatePValue(t: number, df: number): number {
  // Critical t-values for common significance levels (two-tailed)
  // Using approximation for df >= 3
  const criticalValues: [number, number][] = [
    [0.001, 3.291 + 10 / df],
    [0.01, 2.576 + 4 / df],
    [0.05, 1.96 + 2 / df],
  ]
  for (const [p, critical] of criticalValues) {
    if (t >= critical) return p
  }
  return 1.0
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `bun test src/lib/statistics.test.ts`
Expected: PASS

- [ ] **Step 13: Write failing tests for `zScoreNormalize` and `euclideanDistance`**

```typescript
describe("zScoreNormalize", () => {
  it("normalizes values to z-scores", () => {
    const result = zScoreNormalize([2, 4, 4, 4, 5, 5, 7, 9])
    const resultMean = mean(result)
    expect(resultMean).toBeCloseTo(0, 5)
  })
  it("returns zeros for identical values", () => {
    const result = zScoreNormalize([5, 5, 5])
    expect(result).toEqual([0, 0, 0])
  })
})

describe("euclideanDistance", () => {
  it("computes distance between two points", () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBeCloseTo(5, 5)
  })
  it("returns 0 for identical points", () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0)
  })
})

describe("similarityScore", () => {
  it("returns 100 for identical points", () => {
    expect(similarityScore(0)).toBe(100)
  })
  it("returns value between 0 and 100", () => {
    const score = similarityScore(5)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(100)
  })
  it("decreases with distance", () => {
    expect(similarityScore(1)).toBeGreaterThan(similarityScore(10))
  })
})
```

- [ ] **Step 14: Run test to verify it fails**

Run: `bun test src/lib/statistics.test.ts`
Expected: FAIL — functions not found

- [ ] **Step 15: Implement `zScoreNormalize`, `euclideanDistance`, `similarityScore`**

```typescript
export function zScoreNormalize(values: number[]): number[] {
  const avg = mean(values)
  const sd = standardDeviation(values)
  if (sd === 0) return values.map(() => 0)
  return values.map(v => (v - avg) / sd)
}

export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Arrays must have equal length")
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2
  }
  return Math.sqrt(sum)
}

export function similarityScore(distance: number): number {
  return (1 / (1 + distance)) * 100
}
```

- [ ] **Step 16: Run test to verify it passes**

Run: `bun test src/lib/statistics.test.ts`
Expected: PASS

- [ ] **Step 17: Commit**

```bash
git add src/lib/statistics.ts src/lib/statistics.test.ts
git commit -m "feat: add statistics utility with correlation, regression, and similarity math"
```

---

### Task 2: Data fetching hooks — useMultiSeriesData and useAllCountriesForSeries

**Files:**
- Create: `src/lib/hooks/use-multi-series-data.ts`
- Create: `src/lib/hooks/use-all-countries-for-series.ts`
- Read: `src/lib/hooks/use-worldbank-data.ts` (existing patterns)

These hooks compose existing `useCountrySeriesData`-style fetching. No new fetch logic, just batching for different access patterns.

- [ ] **Step 1: Create `useMultiSeriesData` hook**

```typescript
// src/lib/hooks/use-multi-series-data.ts
import { useQuery } from '@tanstack/react-query'
import { getDataFileUrl } from '../constants'
import { getFilenameFromCodes, type Country, type CountrySeriesData } from './use-worldbank-data'

/**
 * Data for one series across multiple countries
 */
export interface MultiSeriesEntry {
  seriesCode: string
  countries: CountrySeriesData[]
}

/**
 * Fetch multiple series for multiple countries.
 * Returns one MultiSeriesEntry per series, each containing data for all requested countries.
 */
export function useMultiSeriesData(seriesCodes: string[], countryCodes: string[]) {
  return useQuery({
    queryKey: ['multi-series-data', seriesCodes, countryCodes],
    queryFn: async (): Promise<MultiSeriesEntry[]> => {
      if (seriesCodes.length === 0 || countryCodes.length === 0) return []

      // Fetch country names
      const countriesResponse = await fetch(getDataFileUrl('_countries.csv'))
      const countriesText = await countriesResponse.text()
      const countryMap = new Map<string, string>()
      countriesText.trim().split('\n').slice(1).forEach(line => {
        const [code, name] = line.split(',').map(v => v.trim().replace(/"/g, ''))
        if (code && name && code !== 'Last Updated:') countryMap.set(code, name)
      })

      const results: MultiSeriesEntry[] = []
      for (const seriesCode of seriesCodes) {
        const countryResults = await Promise.all(
          countryCodes.map(async (countryCode) => {
            const country: Country = { code: countryCode, name: countryMap.get(countryCode) || countryCode }
            try {
              const filename = getFilenameFromCodes(countryCode, seriesCode)
              const response = await fetch(getDataFileUrl(filename))
              if (!response.ok) return { country, data: [] }
              const csvText = await response.text()
              const lines = csvText.trim().split('\n')
              const data = lines.slice(1).map(line => {
                const [year, value] = line.split(',').map(v => v.trim().replace(/"/g, ''))
                return {
                  year: parseInt(year),
                  value: value === '' || value === '..' ? null : parseFloat(value)
                }
              }).filter(item => !isNaN(item.year))
              return { country, data }
            } catch {
              return { country, data: [] }
            }
          })
        )
        results.push({ seriesCode, countries: countryResults })
      }
      return results
    },
    enabled: seriesCodes.length > 0 && countryCodes.length > 0,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  })
}
```

- [ ] **Step 2: Create `useAllCountriesForSeries` hook**

```typescript
// src/lib/hooks/use-all-countries-for-series.ts
import { useQuery } from '@tanstack/react-query'
import { getDataFileUrl } from '../constants'
import { getFilenameFromCodes } from './use-worldbank-data'

export interface CountryYearValue {
  countryCode: string
  countryName: string
  year: number
  value: number | null
}

/**
 * Fetch a single series for all countries that have data for it.
 * Uses _index.csv to find which countries have the series.
 * Limits concurrent fetches to 20.
 */
export function useAllCountriesForSeries(seriesCode: string) {
  return useQuery({
    queryKey: ['all-countries-series', seriesCode],
    queryFn: async (): Promise<CountryYearValue[]> => {
      // Fetch index to find countries with this series
      const indexResponse = await fetch(getDataFileUrl('_index.csv'))
      const indexText = await indexResponse.text()
      const countryCodes = indexText.trim().split('\n').slice(1)
        .map(line => {
          const [code, series] = line.split(',').map(v => v.trim().replace(/"/g, ''))
          return { code, series }
        })
        .filter(entry => entry.series === seriesCode)
        .map(entry => entry.code)

      // Fetch country names
      const countriesResponse = await fetch(getDataFileUrl('_countries.csv'))
      const countriesText = await countriesResponse.text()
      const countryMap = new Map<string, string>()
      countriesText.trim().split('\n').slice(1).forEach(line => {
        const [code, name] = line.split(',').map(v => v.trim().replace(/"/g, ''))
        if (code && name && code !== 'Last Updated:') countryMap.set(code, name)
      })

      // Fetch in batches of 20
      const results: CountryYearValue[] = []
      const batchSize = 20
      for (let i = 0; i < countryCodes.length; i += batchSize) {
        const batch = countryCodes.slice(i, i + batchSize)
        const batchResults = await Promise.all(
          batch.map(async (countryCode) => {
            try {
              const filename = getFilenameFromCodes(countryCode, seriesCode)
              const response = await fetch(getDataFileUrl(filename))
              if (!response.ok) return []
              const csvText = await response.text()
              return csvText.trim().split('\n').slice(1).map(line => {
                const [year, value] = line.split(',').map(v => v.trim().replace(/"/g, ''))
                return {
                  countryCode,
                  countryName: countryMap.get(countryCode) || countryCode,
                  year: parseInt(year),
                  value: value === '' || value === '..' ? null : parseFloat(value)
                }
              }).filter(item => !isNaN(item.year))
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
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/use-multi-series-data.ts src/lib/hooks/use-all-countries-for-series.ts
git commit -m "feat: add data fetching hooks for multi-series and all-countries queries"
```

---

### Task 3: Top-level navigation — App.tsx tabs + StatisticalAnalysis shell

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/StatisticalAnalysis.tsx`

- [ ] **Step 1: Create StatisticalAnalysis shell component**

```typescript
// src/components/StatisticalAnalysis.tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function StatisticalAnalysis() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Statistical Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            Explore correlations, find similar countries, and analyze trends
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="correlation">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="correlation">Correlation</TabsTrigger>
              <TabsTrigger value="similarity">Similarity</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>
            <TabsContent value="correlation" className="mt-4">
              <div className="text-sm text-muted-foreground text-center py-8">
                Correlation analysis coming soon
              </div>
            </TabsContent>
            <TabsContent value="similarity" className="mt-4">
              <div className="text-sm text-muted-foreground text-center py-8">
                Similarity ranking coming soon
              </div>
            </TabsContent>
            <TabsContent value="trends" className="mt-4">
              <div className="text-sm text-muted-foreground text-center py-8">
                Trend analysis coming soon
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Modify App.tsx to add top-level tab navigation**

Replace the contents of `src/App.tsx` with:

```typescript
import { useState } from "react"
import { DataExplorer } from "./components/DataExplorer"
import { StatisticalAnalysis } from "./components/StatisticalAnalysis"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import "./index.css"

export function App() {
  return (
    <>
      <div className="container mx-auto p-8 space-y-8">
        <h1 className="text-5xl font-bold -mb-3 ml-6 leading-tight">AINAB InData</h1>
        <Tabs defaultValue="explorer">
          <TabsList className="ml-6">
            <TabsTrigger value="explorer">Data Explorer</TabsTrigger>
            <TabsTrigger value="analysis">Statistical Analysis</TabsTrigger>
          </TabsList>
          <TabsContent value="explorer">
            <DataExplorer />
          </TabsContent>
          <TabsContent value="analysis">
            <StatisticalAnalysis />
          </TabsContent>
        </Tabs>
      </div>
      <footer className="mt-12 text-center text-sm text-foreground mb-1">
        Data source: World Bank –
        <a
          href="https://data.worldbank.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline ml-1 cursor-pointer hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
        >
          https://data.worldbank.org/
        </a>
      </footer>
    </>
  )
}

export default App
```

- [ ] **Step 3: Verify dev server starts and both tabs render**

Run: `bun dev`
Expected: App loads, both "Data Explorer" and "Statistical Analysis" tabs are visible and clickable. StatisticalAnalysis shows placeholder sub-tabs.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/StatisticalAnalysis.tsx
git commit -m "feat: add top-level navigation tabs and StatisticalAnalysis shell"
```

---

### Task 4: StatsCard — reusable statistics display component

**Files:**
- Create: `src/components/analysis/StatsCard.tsx`

Used by all three analysis sub-tabs to display key-value statistic pairs.

- [ ] **Step 1: Create StatsCard component**

```typescript
// src/components/analysis/StatsCard.tsx
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface StatEntry {
  label: string
  value: string | number
  color?: string
}

interface StatsCardProps {
  readonly title: string
  readonly stats: StatEntry[]
  readonly accentColor?: string
  readonly className?: string
}

export function StatsCard({ title, stats, accentColor, className }: StatsCardProps) {
  return (
    <Card className={cn("", className)} style={accentColor ? { borderLeft: `3px solid ${accentColor}` } : undefined}>
      <CardContent className="p-4">
        <div className="text-xs uppercase text-muted-foreground mb-3" style={accentColor ? { color: accentColor } : undefined}>
          {title}
        </div>
        <div className="space-y-2">
          {stats.map((stat) => (
            <div key={stat.label} className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <span className="text-sm font-semibold" style={stat.color ? { color: stat.color } : undefined}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/analysis/StatsCard.tsx
git commit -m "feat: add StatsCard reusable component for analysis views"
```

---

### Task 5: ScatterChart component

**Files:**
- Create: `src/components/charts/ScatterChart.tsx`

Chart.js scatter plot wrapper used by the Correlation tab.

- [ ] **Step 1: Create ScatterChart component**

```typescript
// src/components/charts/ScatterChart.tsx
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Scatter } from 'react-chartjs-2'

ChartJS.register(LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const COLORS = [
  'rgb(255, 99, 132)',
  'rgb(54, 162, 235)',
  'rgb(255, 205, 86)',
  'rgb(75, 192, 192)',
  'rgb(153, 102, 255)',
  'rgb(255, 159, 64)',
  'rgb(199, 199, 199)',
  'rgb(83, 102, 147)',
]

export interface ScatterDataset {
  label: string
  points: { x: number; y: number }[]
}

interface ScatterChartProps {
  readonly datasets: ScatterDataset[]
  readonly xLabel: string
  readonly yLabel: string
  readonly title?: string
  readonly trendLine?: { slope: number; intercept: number; xMin: number; xMax: number }
}

export function ScatterChart({ datasets, xLabel, yLabel, title, trendLine }: ScatterChartProps) {
  const chartDatasets = datasets.map((ds, index) => ({
    label: ds.label,
    data: ds.points,
    backgroundColor: COLORS[index % COLORS.length] + '80',
    borderColor: COLORS[index % COLORS.length],
    pointRadius: 4,
    pointHoverRadius: 6,
  }))

  // Add trend line dataset if provided
  if (trendLine) {
    chartDatasets.push({
      label: 'Trend',
      data: [
        { x: trendLine.xMin, y: trendLine.slope * trendLine.xMin + trendLine.intercept },
        { x: trendLine.xMax, y: trendLine.slope * trendLine.xMax + trendLine.intercept },
      ],
      backgroundColor: 'rgba(255, 255, 255, 0)',
      borderColor: 'rgba(255, 255, 255, 0.5)',
      pointRadius: 0,
      pointHoverRadius: 0,
      // @ts-expect-error Chart.js scatter accepts these line options
      showLine: true,
      borderDash: [6, 4],
      borderWidth: 2,
    })
  }

  const data = { datasets: chartDatasets }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: !!title, text: title },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { x: number; y: number } }) =>
            `${ctx.dataset.label}: (${ctx.parsed.x.toLocaleString()}, ${ctx.parsed.y.toLocaleString()})`,
        },
      },
    },
    scales: {
      x: { title: { display: true, text: xLabel } },
      y: { title: { display: true, text: yLabel } },
    },
  }

  return <Scatter data={data} options={options} />
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/charts/ScatterChart.tsx
git commit -m "feat: add ScatterChart component for correlation analysis"
```

---

### Task 6: Correlation Analysis tab

**Files:**
- Create: `src/components/analysis/CorrelationAnalysis.tsx`
- Modify: `src/components/StatisticalAnalysis.tsx` (wire in the component)

- [ ] **Step 1: Create CorrelationAnalysis component**

```typescript
// src/components/analysis/CorrelationAnalysis.tsx
import { useState, useMemo } from "react"
import { useCountries, useSeries } from "@/lib/hooks/use-worldbank-data"
import { useMultiSeriesData } from "@/lib/hooks/use-multi-series-data"
import { pearsonCorrelation, linearRegression } from "@/lib/statistics"
import { ScatterChart, type ScatterDataset } from "@/components/charts/ScatterChart"
import { StatsCard, type StatEntry } from "@/components/analysis/StatsCard"
import { CountrySelect } from "@/components/CountrySelect"
import { SeriesSelect } from "@/components/SeriesSelect"
import { DATA_EXPLORER_CONFIG } from "@/lib/config"

export function CorrelationAnalysis() {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([
    ...DATA_EXPLORER_CONFIG.defaultCountries,
  ])
  const [seriesX, setSeriesX] = useState<string>("NY.GDP.PCAP.PP.KD")
  const [seriesY, setSeriesY] = useState<string>("EN.ATM.CO2E.PC")
  const [yearStart, setYearStart] = useState<number>(1990)
  const [yearEnd, setYearEnd] = useState<number>(2023)

  const { data: countries, isLoading: countriesLoading, error: countriesError } = useCountries()
  const { data: series, isLoading: seriesLoading, error: seriesError } = useSeries()

  const seriesCodes = useMemo(() => {
    const codes: string[] = []
    if (seriesX) codes.push(seriesX)
    if (seriesY && seriesY !== seriesX) codes.push(seriesY)
    return codes
  }, [seriesX, seriesY])

  const { data: multiSeriesData, isLoading: dataLoading } = useMultiSeriesData(seriesCodes, selectedCountries)

  const countryOptions = countries?.map(c => ({ value: c.code, label: c.name })) || []
  const seriesOptions = (series?.map(s => ({ value: s.code, label: s.name })) || [])
    .sort((a, b) => a.label.localeCompare(b.label))

  // Pair data points by year for scatter plot
  const { scatterDatasets, allXValues, allYValues, perCountryStats } = useMemo(() => {
    if (!multiSeriesData || multiSeriesData.length < 2 || !seriesX || !seriesY) {
      return { scatterDatasets: [], allXValues: [], allYValues: [], perCountryStats: [] }
    }

    const xSeriesData = multiSeriesData.find(e => e.seriesCode === seriesX)
    const ySeriesData = multiSeriesData.find(e => e.seriesCode === seriesY)
    if (!xSeriesData || !ySeriesData) {
      return { scatterDatasets: [], allXValues: [], allYValues: [], perCountryStats: [] }
    }

    const datasets: ScatterDataset[] = []
    const allX: number[] = []
    const allY: number[] = []
    const countryStats: { name: string; r: number }[] = []

    for (const countryCode of selectedCountries) {
      const xCountry = xSeriesData.countries.find(c => c.country.code === countryCode)
      const yCountry = ySeriesData.countries.find(c => c.country.code === countryCode)
      if (!xCountry || !yCountry) continue

      const xMap = new Map(xCountry.data.map(d => [d.year, d.value]))
      const yMap = new Map(yCountry.data.map(d => [d.year, d.value]))

      const points: { x: number; y: number }[] = []
      const xs: number[] = []
      const ys: number[] = []

      for (const year of xMap.keys()) {
        if (year < yearStart || year > yearEnd) continue
        const xVal = xMap.get(year)
        const yVal = yMap.get(year)
        if (xVal != null && yVal != null) {
          points.push({ x: xVal, y: yVal })
          xs.push(xVal)
          ys.push(yVal)
        }
      }

      if (points.length > 0) {
        const countryName = xCountry.country.name
        datasets.push({ label: countryName, points })
        allX.push(...xs)
        allY.push(...ys)

        if (xs.length >= 3) {
          try {
            const corr = pearsonCorrelation(xs, ys)
            countryStats.push({ name: countryName, r: corr.r })
          } catch { /* not enough data */ }
        }
      }
    }

    return { scatterDatasets: datasets, allXValues: allX, allYValues: allY, perCountryStats: countryStats }
  }, [multiSeriesData, seriesX, seriesY, selectedCountries, yearStart, yearEnd])

  // Overall stats
  const overallStats = useMemo(() => {
    if (allXValues.length < 5) return null
    try {
      const corr = pearsonCorrelation(allXValues, allYValues)
      const reg = linearRegression(allXValues, allYValues)
      return { ...corr, trendSlope: reg.slope, trendIntercept: reg.intercept }
    } catch {
      return null
    }
  }, [allXValues, allYValues])

  const xSeriesName = series?.find(s => s.code === seriesX)?.name || seriesX
  const ySeriesName = series?.find(s => s.code === seriesY)?.name || seriesY

  const trendLine = overallStats ? {
    slope: overallStats.trendSlope,
    intercept: overallStats.trendIntercept,
    xMin: Math.min(...allXValues),
    xMax: Math.max(...allXValues),
  } : undefined

  const overallStatsEntries: StatEntry[] = overallStats ? [
    { label: "Pearson R", value: overallStats.r.toFixed(3), color: "rgb(75, 192, 192)" },
    { label: "R\u00B2", value: overallStats.rSquared.toFixed(3), color: "rgb(75, 192, 192)" },
    { label: "p-value", value: overallStats.pValue < 0.001 ? "< 0.001" : overallStats.pValue < 0.01 ? "< 0.01" : overallStats.pValue < 0.05 ? "< 0.05" : "\u2265 0.05", color: overallStats.pValue < 0.05 ? "rgb(76, 175, 80)" : "rgb(255, 152, 0)" },
    { label: "N (data points)", value: overallStats.n },
  ] : []

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-xs uppercase text-muted-foreground">X-Axis Series</label>
          <SeriesSelect seriesOptions={seriesOptions} selectedSeries={seriesX} onSelectionChange={setSeriesX} isLoading={seriesLoading} error={seriesError} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase text-muted-foreground">Y-Axis Series</label>
          <SeriesSelect seriesOptions={seriesOptions} selectedSeries={seriesY} onSelectionChange={setSeriesY} isLoading={seriesLoading} error={seriesError} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase text-muted-foreground">Countries</label>
          <CountrySelect countryOptions={countryOptions} selectedCountries={selectedCountries} onSelectionChange={setSelectedCountries} isLoading={countriesLoading} error={countriesError} />
        </div>
      </div>

      {/* Year range */}
      <div className="flex gap-4 items-center">
        <label className="text-xs uppercase text-muted-foreground">Year Range</label>
        <input type="number" value={yearStart} onChange={e => setYearStart(Number(e.target.value))} className="w-20 bg-muted border border-border rounded px-2 py-1 text-sm" />
        <span className="text-muted-foreground">—</span>
        <input type="number" value={yearEnd} onChange={e => setYearEnd(Number(e.target.value))} className="w-20 bg-muted border border-border rounded px-2 py-1 text-sm" />
      </div>

      {/* Loading */}
      {dataLoading && (
        <div className="text-sm text-muted-foreground text-center py-8">Loading data...</div>
      )}

      {/* Results */}
      {!dataLoading && scatterDatasets.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-[2] h-96">
            <ScatterChart
              datasets={scatterDatasets}
              xLabel={xSeriesName}
              yLabel={ySeriesName}
              title={`${xSeriesName} vs ${ySeriesName}`}
              trendLine={trendLine}
            />
          </div>
          <div className="flex-1 space-y-3">
            {overallStats && <StatsCard title="Overall Statistics" stats={overallStatsEntries} />}
            {allXValues.length < 5 && allXValues.length > 0 && (
              <div className="text-sm text-yellow-500 p-3 bg-yellow-500/10 rounded">
                Warning: Only {allXValues.length} data points. Need at least 5 for meaningful statistics.
              </div>
            )}
            {perCountryStats.length > 0 && (
              <StatsCard
                title="Per Country"
                stats={perCountryStats.map(cs => ({
                  label: cs.name,
                  value: `R = ${cs.r.toFixed(3)}`,
                }))}
              />
            )}
          </div>
        </div>
      )}

      {/* No data */}
      {!dataLoading && scatterDatasets.length === 0 && seriesX && seriesY && selectedCountries.length > 0 && (
        <div className="text-sm text-muted-foreground text-center py-8">
          No overlapping data found for the selected series and countries in the specified year range.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire CorrelationAnalysis into StatisticalAnalysis.tsx**

In `src/components/StatisticalAnalysis.tsx`, replace the correlation placeholder:

Replace:
```typescript
<TabsContent value="correlation" className="mt-4">
  <div className="text-sm text-muted-foreground text-center py-8">
    Correlation analysis coming soon
  </div>
</TabsContent>
```

With:
```typescript
<TabsContent value="correlation" className="mt-4">
  <CorrelationAnalysis />
</TabsContent>
```

Add import at top:
```typescript
import { CorrelationAnalysis } from "@/components/analysis/CorrelationAnalysis"
```

- [ ] **Step 3: Verify in browser**

Run: `bun dev`
Expected: Navigate to Statistical Analysis > Correlation. Select two series and countries. Scatter plot renders with stats panel.

- [ ] **Step 4: Commit**

```bash
git add src/components/analysis/CorrelationAnalysis.tsx src/components/StatisticalAnalysis.tsx
git commit -m "feat: add Correlation Analysis tab with scatter plot and statistics"
```

---

### Task 7: Similarity Ranking tab

**Files:**
- Create: `src/components/analysis/SimilarityRanking.tsx`
- Modify: `src/components/StatisticalAnalysis.tsx` (wire in)

- [ ] **Step 1: Create SimilarityRanking component**

```typescript
// src/components/analysis/SimilarityRanking.tsx
import { useState, useMemo } from "react"
import { useQueries } from "@tanstack/react-query"
import { useCountries, useSeries, getFilenameFromCodes } from "@/lib/hooks/use-worldbank-data"
import { getDataFileUrl } from "@/lib/constants"
import { zScoreNormalize, euclideanDistance, similarityScore, mean } from "@/lib/statistics"
import { SeriesSelect } from "@/components/SeriesSelect"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CountryYearValue } from "@/lib/hooks/use-all-countries-for-series"

interface SimilarCountry {
  code: string
  name: string
  similarity: number
  values: Map<string, number>
}

/**
 * Build a TanStack Query options object for fetching all countries for a series.
 * This allows us to use useQueries() instead of calling hooks in a loop.
 */
function allCountriesQueryOptions(seriesCode: string) {
  return {
    queryKey: ['all-countries-series', seriesCode],
    queryFn: async (): Promise<CountryYearValue[]> => {
      const indexResponse = await fetch(getDataFileUrl('_index.csv'))
      const indexText = await indexResponse.text()
      const countryCodes = indexText.trim().split('\n').slice(1)
        .map(line => {
          const [code, series] = line.split(',').map(v => v.trim().replace(/"/g, ''))
          return { code, series }
        })
        .filter(entry => entry.series === seriesCode)
        .map(entry => entry.code)

      const countriesResponse = await fetch(getDataFileUrl('_countries.csv'))
      const countriesText = await countriesResponse.text()
      const countryMap = new Map<string, string>()
      countriesText.trim().split('\n').slice(1).forEach(line => {
        const [code, name] = line.split(',').map(v => v.trim().replace(/"/g, ''))
        if (code && name && code !== 'Last Updated:') countryMap.set(code, name)
      })

      const results: CountryYearValue[] = []
      const batchSize = 20
      for (let i = 0; i < countryCodes.length; i += batchSize) {
        const batch = countryCodes.slice(i, i + batchSize)
        const batchResults = await Promise.all(
          batch.map(async (countryCode) => {
            try {
              const filename = getFilenameFromCodes(countryCode, seriesCode)
              const response = await fetch(getDataFileUrl(filename))
              if (!response.ok) return []
              const csvText = await response.text()
              return csvText.trim().split('\n').slice(1).map(line => {
                const [year, value] = line.split(',').map(v => v.trim().replace(/"/g, ''))
                return {
                  countryCode,
                  countryName: countryMap.get(countryCode) || countryCode,
                  year: parseInt(year),
                  value: value === '' || value === '..' ? null : parseFloat(value)
                }
              }).filter(item => !isNaN(item.year))
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

export function SimilarityRanking() {
  const [referenceCountry, setReferenceCountry] = useState<string>("NLD")
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(["NY.GDP.PCAP.PP.KD"])
  const [year, setYear] = useState<number>(2023)

  // For adding indicators one at a time
  const [pendingIndicator, setPendingIndicator] = useState<string>("")

  const { data: countries, isLoading: countriesLoading } = useCountries()
  const { data: series, isLoading: seriesLoading, error: seriesError } = useSeries()

  // Fetch data for each selected indicator using useQueries (safe with dynamic array)
  const indicatorResults = useQueries({
    queries: selectedIndicators.map(code => allCountriesQueryOptions(code)),
  })

  const indicatorQueries = selectedIndicators.map((code, i) => ({
    code,
    data: indicatorResults[i].data,
    isLoading: indicatorResults[i].isLoading,
  }))

  const isLoading = countriesLoading || indicatorQueries.some(q => q.isLoading)

  const countryOptions = countries?.map(c => ({ value: c.code, label: c.name })) || []
  const seriesOptions = (series?.map(s => ({ value: s.code, label: s.name })) || [])
    .sort((a, b) => a.label.localeCompare(b.label))

  // Compute similarity rankings
  const { referenceValues, rankedCountries } = useMemo(() => {
    if (indicatorQueries.some(q => !q.data) || selectedIndicators.length === 0) {
      return { referenceValues: new Map<string, number>(), rankedCountries: [] }
    }

    // Build country -> indicator -> value map for the selected year
    const countryData = new Map<string, Map<string, number>>()
    const countryNames = new Map<string, string>()

    for (const query of indicatorQueries) {
      if (!query.data) continue
      for (const entry of query.data) {
        if (entry.year !== year || entry.value == null) continue
        if (!countryData.has(entry.countryCode)) {
          countryData.set(entry.countryCode, new Map())
        }
        countryData.get(entry.countryCode)!.set(query.code, entry.value)
        countryNames.set(entry.countryCode, entry.countryName)
      }
    }

    // Filter to countries that have data for ALL indicators
    const completeCountries = Array.from(countryData.entries())
      .filter(([, indicators]) => selectedIndicators.every(code => indicators.has(code)))

    if (completeCountries.length < 2) {
      return { referenceValues: new Map<string, number>(), rankedCountries: [] }
    }

    // Z-score normalize each indicator across all complete countries
    const normalizedData = new Map<string, number[]>()
    for (const code of selectedIndicators) {
      const rawValues = completeCountries.map(([, indicators]) => indicators.get(code)!)
      const normalized = zScoreNormalize(rawValues)
      normalizedData.set(code, normalized)
    }

    // Find reference country index
    const refIndex = completeCountries.findIndex(([code]) => code === referenceCountry)
    if (refIndex === -1) {
      return { referenceValues: new Map<string, number>(), rankedCountries: [] }
    }

    const refVector = selectedIndicators.map(code => normalizedData.get(code)![refIndex])
    const refValues = completeCountries[refIndex][1]

    // Compute distances
    const ranked: SimilarCountry[] = completeCountries
      .map(([countryCode, indicators], i) => {
        if (countryCode === referenceCountry) return null
        const vector = selectedIndicators.map(code => normalizedData.get(code)![i])
        const dist = euclideanDistance(refVector, vector)
        return {
          code: countryCode,
          name: countryNames.get(countryCode) || countryCode,
          similarity: similarityScore(dist),
          values: indicators,
        }
      })
      .filter((c): c is SimilarCountry => c !== null)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10)

    return { referenceValues: refValues, rankedCountries: ranked }
  }, [indicatorQueries, selectedIndicators, year, referenceCountry])

  const addIndicator = () => {
    if (pendingIndicator && !selectedIndicators.includes(pendingIndicator)) {
      setSelectedIndicators([...selectedIndicators, pendingIndicator])
      setPendingIndicator("")
    }
  }

  const removeIndicator = (code: string) => {
    setSelectedIndicators(selectedIndicators.filter(c => c !== code))
  }

  const referenceCountryName = countries?.find(c => c.code === referenceCountry)?.name || referenceCountry
  const getSeriesName = (code: string) => series?.find(s => s.code === code)?.name || code

  const rankColors = ["rgb(76, 175, 80)", "rgb(139, 195, 74)", "rgb(205, 220, 57)", "rgb(255, 193, 7)", "rgb(255, 152, 0)", "rgb(255, 87, 34)", "rgb(244, 67, 54)", "rgb(233, 30, 99)", "rgb(156, 39, 176)", "rgb(103, 58, 183)"]

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-xs uppercase text-muted-foreground">Reference Country</label>
          <select
            value={referenceCountry}
            onChange={e => setReferenceCountry(e.target.value)}
            className="w-full bg-muted border border-border rounded px-3 py-2 text-sm"
          >
            {countryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase text-muted-foreground">Add Indicator</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <SeriesSelect seriesOptions={seriesOptions} selectedSeries={pendingIndicator} onSelectionChange={setPendingIndicator} isLoading={seriesLoading} error={seriesError} />
            </div>
            <button onClick={addIndicator} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">Add</button>
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedIndicators.map(code => (
              <span key={code} className="inline-flex items-center gap-1 bg-primary/10 border border-primary/30 rounded px-2 py-0.5 text-xs">
                {getSeriesName(code).slice(0, 30)}
                <button onClick={() => removeIndicator(code)} className="text-muted-foreground hover:text-foreground">×</button>
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase text-muted-foreground">Year</label>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-24 bg-muted border border-border rounded px-2 py-1 text-sm" />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-sm text-muted-foreground text-center py-8">Loading data...</div>
      )}

      {/* Reference country card */}
      {!isLoading && referenceValues.size > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <span className="font-semibold">{referenceCountryName}</span>
              <span className="text-sm text-muted-foreground ml-2">Reference</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              {selectedIndicators.map(code => (
                <span key={code}>{getSeriesName(code).slice(0, 20)}: {referenceValues.get(code)?.toLocaleString() ?? "—"}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranked list */}
      {!isLoading && rankedCountries.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs uppercase text-muted-foreground px-4 mb-2">Most similar countries</div>
          {rankedCountries.map((country, i) => (
            <Card key={country.code}>
              <CardContent className="p-3 flex items-center gap-4">
                <span className="font-bold text-lg w-7 text-center" style={{ color: rankColors[i] }}>{i + 1}</span>
                <div className="flex-1">
                  <span className="font-medium">{country.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{country.code}</span>
                </div>
                <div className="flex gap-6 text-xs text-muted-foreground">
                  {selectedIndicators.map(code => (
                    <span key={code}>{country.values.get(code)?.toLocaleString() ?? "—"}</span>
                  ))}
                </div>
                <div className="w-28">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-muted-foreground">Similarity</span>
                    <span className="font-semibold" style={{ color: rankColors[i] }}>{country.similarity.toFixed(1)}%</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${country.similarity}%`, backgroundColor: rankColors[i] }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No results */}
      {!isLoading && rankedCountries.length === 0 && selectedIndicators.length > 0 && (
        <div className="text-sm text-muted-foreground text-center py-8">
          No countries found with complete data for all selected indicators in {year}. Try a different year or fewer indicators.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire SimilarityRanking into StatisticalAnalysis.tsx**

In `src/components/StatisticalAnalysis.tsx`, replace the similarity placeholder:

Replace:
```typescript
<TabsContent value="similarity" className="mt-4">
  <div className="text-sm text-muted-foreground text-center py-8">
    Similarity ranking coming soon
  </div>
</TabsContent>
```

With:
```typescript
<TabsContent value="similarity" className="mt-4">
  <SimilarityRanking />
</TabsContent>
```

Add import:
```typescript
import { SimilarityRanking } from "@/components/analysis/SimilarityRanking"
```

- [ ] **Step 3: Verify in browser**

Run: `bun dev`
Expected: Navigate to Statistical Analysis > Similarity. Select a reference country and indicators. Ranked list of similar countries appears.

- [ ] **Step 4: Commit**

```bash
git add src/components/analysis/SimilarityRanking.tsx src/components/StatisticalAnalysis.tsx
git commit -m "feat: add Similarity Ranking tab with z-score normalization"
```

---

### Task 8: Trend Analysis tab

**Files:**
- Create: `src/components/analysis/TrendAnalysis.tsx`
- Modify: `src/components/StatisticalAnalysis.tsx` (wire in)

- [ ] **Step 1: Create TrendAnalysis component**

```typescript
// src/components/analysis/TrendAnalysis.tsx
import { useState, useMemo } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { useCountries, useSeries, useCountrySeriesData } from "@/lib/hooks/use-worldbank-data"
import { linearRegression } from "@/lib/statistics"
import { StatsCard, type StatEntry } from "@/components/analysis/StatsCard"
import { SeriesSelect } from "@/components/SeriesSelect"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface PeriodStats {
  slope: number
  rSquared: number
  growthRate: number
  startValue: number
  endValue: number
}

function computePeriodStats(data: { year: number; value: number | null }[], startYear: number, endYear: number): PeriodStats | null {
  const filtered = data
    .filter(d => d.year >= startYear && d.year <= endYear && d.value != null)
    .map(d => ({ year: d.year, value: d.value as number }))

  if (filtered.length < 3) return null

  const xs = filtered.map(d => d.year)
  const ys = filtered.map(d => d.value)
  const reg = linearRegression(xs, ys)

  const startValue = filtered[0].value
  const endValue = filtered[filtered.length - 1].value
  const years = filtered[filtered.length - 1].year - filtered[0].year
  const growthRate = years > 0 ? ((endValue / startValue) ** (1 / years) - 1) * 100 : 0

  return { slope: reg.slope, rSquared: reg.rSquared, growthRate, startValue, endValue }
}

export function TrendAnalysis() {
  const [selectedCountry, setSelectedCountry] = useState<string>("NLD")
  const [selectedSeries, setSelectedSeries] = useState<string>("NY.GDP.PCAP.PP.KD")
  const [periodAStart, setPeriodAStart] = useState<number>(1990)
  const [periodAEnd, setPeriodAEnd] = useState<number>(2005)
  const [periodBStart, setPeriodBStart] = useState<number>(2005)
  const [periodBEnd, setPeriodBEnd] = useState<number>(2023)

  const { data: countries, isLoading: countriesLoading } = useCountries()
  const { data: series, isLoading: seriesLoading, error: seriesError } = useSeries()
  const { data: seriesData, isLoading: dataLoading } = useCountrySeriesData(selectedCountry, selectedSeries)

  const countryOptions = countries?.map(c => ({ value: c.code, label: c.name })) || []
  const seriesOptions = (series?.map(s => ({ value: s.code, label: s.name })) || [])
    .sort((a, b) => a.label.localeCompare(b.label))

  const periodA = useMemo(() => seriesData ? computePeriodStats(seriesData, periodAStart, periodAEnd) : null, [seriesData, periodAStart, periodAEnd])
  const periodB = useMemo(() => seriesData ? computePeriodStats(seriesData, periodBStart, periodBEnd) : null, [seriesData, periodBStart, periodBEnd])

  const selectedCountryName = countries?.find(c => c.code === selectedCountry)?.name || selectedCountry
  const selectedSeriesName = series?.find(s => s.code === selectedSeries)?.name || selectedSeries

  // Chart data
  const chartData = useMemo(() => {
    if (!seriesData) return null

    const allYears = seriesData.filter(d => d.value != null).map(d => d.year).sort((a, b) => a - b)
    if (allYears.length === 0) return null

    const values = allYears.map(year => {
      const point = seriesData.find(d => d.year === year)
      return point?.value ?? null
    })

    const datasets: any[] = [
      {
        label: "Actual",
        data: values,
        borderColor: "rgba(150, 150, 150, 0.6)",
        backgroundColor: "rgba(150, 150, 150, 0.2)",
        pointRadius: 3,
        tension: 0.1,
      },
    ]

    // Period A trend line
    if (periodA) {
      const reg = linearRegression(
        seriesData.filter(d => d.year >= periodAStart && d.year <= periodAEnd && d.value != null).map(d => d.year),
        seriesData.filter(d => d.year >= periodAStart && d.year <= periodAEnd && d.value != null).map(d => d.value as number)
      )
      datasets.push({
        label: `Period A (${periodAStart}–${periodAEnd})`,
        data: allYears.map(year => {
          if (year < periodAStart || year > periodAEnd) return null
          return reg.slope * year + reg.intercept
        }),
        borderColor: "rgb(255, 99, 132)",
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0,
      })
    }

    // Period B trend line
    if (periodB) {
      const reg = linearRegression(
        seriesData.filter(d => d.year >= periodBStart && d.year <= periodBEnd && d.value != null).map(d => d.year),
        seriesData.filter(d => d.year >= periodBStart && d.year <= periodBEnd && d.value != null).map(d => d.value as number)
      )
      datasets.push({
        label: `Period B (${periodBStart}–${periodBEnd})`,
        data: allYears.map(year => {
          if (year < periodBStart || year > periodBEnd) return null
          return reg.slope * year + reg.intercept
        }),
        borderColor: "rgb(54, 162, 235)",
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0,
      })
    }

    return { labels: allYears, datasets }
  }, [seriesData, periodA, periodB, periodAStart, periodAEnd, periodBStart, periodBEnd])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: `${selectedSeriesName} — ${selectedCountryName}` },
    },
    scales: { y: { beginAtZero: false } },
    interaction: { mode: 'index' as const, intersect: false },
  }

  const formatValue = (v: number) => {
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`
    if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}k`
    return v.toFixed(1)
  }

  const periodAStats: StatEntry[] = periodA ? [
    { label: "Growth rate", value: `${periodA.growthRate >= 0 ? "+" : ""}${periodA.growthRate.toFixed(1)}% / year`, color: periodA.growthRate >= 0 ? "rgb(76, 175, 80)" : "rgb(255, 87, 34)" },
    { label: "Slope", value: `${periodA.slope >= 0 ? "+" : ""}${formatValue(periodA.slope)} / year` },
    { label: "R\u00B2", value: periodA.rSquared.toFixed(3) },
    { label: "Start \u2192 End", value: `${formatValue(periodA.startValue)} \u2192 ${formatValue(periodA.endValue)}` },
  ] : []

  const periodBStats: StatEntry[] = periodB ? [
    { label: "Growth rate", value: `${periodB.growthRate >= 0 ? "+" : ""}${periodB.growthRate.toFixed(1)}% / year`, color: periodB.growthRate >= 0 ? "rgb(76, 175, 80)" : "rgb(255, 87, 34)" },
    { label: "Slope", value: `${periodB.slope >= 0 ? "+" : ""}${formatValue(periodB.slope)} / year` },
    { label: "R\u00B2", value: periodB.rSquared.toFixed(3) },
    { label: "Start \u2192 End", value: `${formatValue(periodB.startValue)} \u2192 ${formatValue(periodB.endValue)}` },
  ] : []

  const comparisonStats: StatEntry[] = periodA && periodB ? [
    {
      label: "Growth change",
      value: `${(periodB.growthRate - periodA.growthRate) >= 0 ? "+" : ""}${(periodB.growthRate - periodA.growthRate).toFixed(1)} pp / year`,
      color: (periodB.growthRate - periodA.growthRate) >= 0 ? "rgb(76, 175, 80)" : "rgb(255, 87, 34)",
    },
    {
      label: "Slope change",
      value: periodA.slope !== 0 ? `${(((periodB.slope - periodA.slope) / Math.abs(periodA.slope)) * 100).toFixed(1)}%` : "N/A",
      color: periodB.slope >= periodA.slope ? "rgb(76, 175, 80)" : "rgb(255, 87, 34)",
    },
  ] : []

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs uppercase text-muted-foreground">Country</label>
          <select
            value={selectedCountry}
            onChange={e => setSelectedCountry(e.target.value)}
            className="w-full bg-muted border border-border rounded px-3 py-2 text-sm"
          >
            {countryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase text-muted-foreground">Series</label>
          <SeriesSelect seriesOptions={seriesOptions} selectedSeries={selectedSeries} onSelectionChange={setSelectedSeries} isLoading={seriesLoading} error={seriesError} />
        </div>
      </div>

      {/* Period controls */}
      <div className="flex flex-wrap gap-6 items-center">
        <div className="flex gap-2 items-center">
          <span className="text-xs uppercase font-semibold" style={{ color: "rgb(255, 99, 132)" }}>Period A</span>
          <input type="number" value={periodAStart} onChange={e => setPeriodAStart(Number(e.target.value))} className="w-20 bg-muted border border-border rounded px-2 py-1 text-sm" />
          <span className="text-muted-foreground">—</span>
          <input type="number" value={periodAEnd} onChange={e => setPeriodAEnd(Number(e.target.value))} className="w-20 bg-muted border border-border rounded px-2 py-1 text-sm" />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs uppercase font-semibold" style={{ color: "rgb(54, 162, 235)" }}>Period B</span>
          <input type="number" value={periodBStart} onChange={e => setPeriodBStart(Number(e.target.value))} className="w-20 bg-muted border border-border rounded px-2 py-1 text-sm" />
          <span className="text-muted-foreground">—</span>
          <input type="number" value={periodBEnd} onChange={e => setPeriodBEnd(Number(e.target.value))} className="w-20 bg-muted border border-border rounded px-2 py-1 text-sm" />
        </div>
      </div>

      {/* Loading */}
      {dataLoading && (
        <div className="text-sm text-muted-foreground text-center py-8">Loading data...</div>
      )}

      {/* Results */}
      {!dataLoading && chartData && (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-[2] h-96">
            <Line data={chartData} options={chartOptions} />
          </div>
          <div className="flex-1 space-y-3">
            {periodA && <StatsCard title={`Period A \u00B7 ${periodAStart}–${periodAEnd}`} stats={periodAStats} accentColor="rgb(255, 99, 132)" />}
            {periodB && <StatsCard title={`Period B \u00B7 ${periodBStart}–${periodBEnd}`} stats={periodBStats} accentColor="rgb(54, 162, 235)" />}
            {comparisonStats.length > 0 && <StatsCard title="Comparison" stats={comparisonStats} />}
            {(!periodA || !periodB) && seriesData && seriesData.length > 0 && (
              <div className="text-sm text-yellow-500 p-3 bg-yellow-500/10 rounded">
                Not enough data points in one or both periods. Need at least 3 per period.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire TrendAnalysis into StatisticalAnalysis.tsx**

In `src/components/StatisticalAnalysis.tsx`, replace the trends placeholder:

Replace:
```typescript
<TabsContent value="trends" className="mt-4">
  <div className="text-sm text-muted-foreground text-center py-8">
    Trend analysis coming soon
  </div>
</TabsContent>
```

With:
```typescript
<TabsContent value="trends" className="mt-4">
  <TrendAnalysis />
</TabsContent>
```

Add import:
```typescript
import { TrendAnalysis } from "@/components/analysis/TrendAnalysis"
```

- [ ] **Step 3: Verify in browser**

Run: `bun dev`
Expected: Navigate to Statistical Analysis > Trends. Select country, series, and two time periods. Line chart with trend lines and stats panels render correctly.

- [ ] **Step 4: Commit**

```bash
git add src/components/analysis/TrendAnalysis.tsx src/components/StatisticalAnalysis.tsx
git commit -m "feat: add Trend Analysis tab with period comparison and regression"
```

---

### Task 9: Run all tests and final verification

**Files:** None new — this is a verification pass.

- [ ] **Step 1: Run all tests**

Run: `bun test`
Expected: All tests pass, including the new statistics tests.

- [ ] **Step 2: Run production build**

Run: `bun run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Verify all three tabs work end-to-end in browser**

Run: `bun dev`
Verify:
1. Top-level tabs switch between Data Explorer and Statistical Analysis
2. Correlation: Select two series + countries → scatter plot + stats appear
3. Similarity: Select reference country + indicators → ranked list appears
4. Trends: Select country + series + two periods → trend chart + comparison stats appear
5. Existing DataExplorer still works normally

- [ ] **Step 4: Commit any fixes if needed, then final commit**

```bash
git add -A
git commit -m "feat: complete Statistical Analysis tool with correlation, similarity, and trend analysis"
```
