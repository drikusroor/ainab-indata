# Statistical Analysis Tool — Design Spec

## Overview

Add a Statistical Analysis tool to ainab-indata as a new top-level view alongside the existing DataExplorer. The tool provides three analysis modes: **Correlation**, **Similarity Ranking**, and **Trend Analysis** — each as a sub-tab with independent state and controls.

## Navigation

- A top-level tab bar in `App.tsx` switches between "Data Explorer" and "Statistical Analysis"
- Uses the existing shadcn/ui `Tabs` component
- `StatisticalAnalysis` is a new top-level component at the same level as `DataExplorer`
- Three sub-tabs inside: Correlation, Similarity, Trends — each a standalone component

## Correlation Analysis

**Purpose**: Answer "Does series X correlate with series Y across selected countries?"

**Controls**:
- Two series selectors (X-axis, Y-axis) — reuses `SearchableSelect`/`SeriesSelect`
- Country multi-select — reuses `MultiSelect`/`CountrySelect`
- Year range filter (start year, end year)

**Visualization**:
- Chart.js scatter plot via react-chartjs-2
- Each dot = one (country, year) observation, colored by country
- Linear trend line overlay
- Legend showing country colors

**Statistics panel** (displayed alongside the chart):
- Overall: Pearson R, R², p-value, N (data points)
- Per-country: Individual R values

**Data flow**:
- Fetches both series for all selected countries using existing `useCountrySeriesData` (batched)
- Pairs data points by year — only includes years where both series have non-null values
- Computes stats client-side

## Similarity Ranking

**Purpose**: Answer "Which countries are most similar to country X across selected indicators?"

**Controls**:
- Reference country selector (single select)
- Indicator multi-select — pick 1+ series to compare on
- Year selector (single year, defaults to most recent available)

**Visualization**:
- Reference country card showing its actual values for selected indicators
- Ranked list of top 10 most similar countries, each showing:
  - Rank number (color-coded)
  - Country name/code
  - Actual values for each indicator
  - Similarity score as percentage with progress bar

**Algorithm**:
1. Fetch selected indicators for all countries (uses `_index.csv` to find available data)
2. Z-score normalize each indicator across all countries: `(value - mean) / stddev`
3. Compute Euclidean distance from the reference country in normalized space
4. Convert to similarity: `similarity = 1 / (1 + distance)` scaled to 0-100%
5. Sort descending, show top 10

**Data flow**:
- New `useAllCountriesForSeries` hook fetches one series for all countries that have data (reads `_index.csv` to know which countries have the series)
- Called once per selected indicator
- Results combined and normalized client-side

## Trend Analysis

**Purpose**: Answer "Is this indicator accelerating or decelerating? How does period A compare to period B?"

**Controls**:
- Country selector (single)
- Series selector (single)
- Period A: start year — end year
- Period B: start year — end year

**Visualization**:
- Line chart showing actual data points (gray dots)
- Dashed regression line for Period A (color-coded, e.g. red)
- Dashed regression line for Period B (color-coded, e.g. blue)
- Background bands highlighting each period

**Statistics panels**:
- Per-period card (one for A, one for B):
  - Annual growth rate (percentage)
  - Absolute slope (value/year)
  - R² (goodness of fit)
  - Start value → End value
- Comparison card:
  - Growth rate change (percentage points)
  - Slope change (percentage)

**Data flow**:
- Reuses existing `useCountrySeriesData` for the single country-series pair
- Filters data into two period arrays
- Computes linear regression client-side for each period

## New Files

### Components
| File | Purpose |
|------|---------|
| `src/components/StatisticalAnalysis.tsx` | Top-level container with sub-tab navigation |
| `src/components/analysis/CorrelationAnalysis.tsx` | Correlation tab — controls + scatter plot + stats |
| `src/components/analysis/SimilarityRanking.tsx` | Similarity tab — controls + ranked list |
| `src/components/analysis/TrendAnalysis.tsx` | Trends tab — controls + line chart + stats |
| `src/components/analysis/StatsCard.tsx` | Reusable card for displaying key-value stat pairs |
| `src/components/charts/ScatterChart.tsx` | Chart.js scatter plot wrapper |

### Hooks
| File | Purpose |
|------|---------|
| `src/lib/hooks/use-multi-series-data.ts` | Fetch 2+ series for multiple countries |
| `src/lib/hooks/use-all-countries-for-series.ts` | Fetch one series for all countries (uses _index.csv) |
| `src/lib/hooks/use-correlation.ts` | Compute correlation stats from paired data |
| `src/lib/hooks/use-similarity.ts` | Z-score normalize + rank countries by distance |
| `src/lib/hooks/use-trend-analysis.ts` | Linear regression + period comparison |

### Utilities
| File | Purpose |
|------|---------|
| `src/lib/statistics.ts` | Pure math functions: Pearson R, R², p-value approximation, linear regression, z-score normalization, Euclidean distance |

## Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add top-level tab bar switching between DataExplorer and StatisticalAnalysis |

## Statistics Math (client-side, no external library)

All computations in `src/lib/statistics.ts`:

- **Pearson R**: `Σ((xi - x̄)(yi - ȳ)) / √(Σ(xi - x̄)² · Σ(yi - ȳ)²)`
- **R²**: `R²` (coefficient of determination)
- **p-value**: Approximated via t-statistic: `t = R√(n-2) / √(1-R²)`, compared against t-distribution critical values for common thresholds (< 0.001, < 0.01, < 0.05, ≥ 0.05)
- **Linear regression (least-squares)**: slope `m = Σ((xi - x̄)(yi - ȳ)) / Σ(xi - x̄)²`, intercept `b = ȳ - m·x̄`
- **Z-score normalization**: `(value - mean) / stddev` per indicator across all countries
- **Similarity score**: `(1 / (1 + euclideanDistance)) * 100`

Estimated ~100-150 lines of TypeScript.

## Performance

- Fetch on demand, show loading states. No pre-fetching or background loading.
- TanStack Query handles caching (same cache config as existing hooks) and deduplication.
- Similarity ranking fetches the most data (all countries for N indicators). The `_index.csv` is used to avoid fetching non-existent files. Progressive loading: show results as each indicator loads.
- Computation hooks use `useMemo` to avoid recalculating on unrelated re-renders.

## Null Data Handling

- Correlation: Only pair data points where both series have non-null values for that year
- Similarity: Skip countries that don't have data for all selected indicators in the chosen year
- Trends: Skip null values in regression calculation; require at least 3 data points per period

## Out of Scope

- Clustering visualization (PCA, t-SNE, k-means)
- Moving averages
- Forecasting / extrapolation
- Data export
- URL state persistence / deep linking
- Plain-English interpretation of stats
