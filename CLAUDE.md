# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ainab-indata** is a React 19 + TypeScript single-page application for exploring World Bank development indicators. It visualizes data across 267 countries and 145+ data series (1960–2024) using interactive charts and tables. The runtime is **Bun** (not Node.js or Vite).

## Commands

```bash
bun install              # Install dependencies
bun dev                  # Dev server with HMR (default: localhost:3000)
bun run build            # Production build to dist/
bun start                # Production server
bun test                 # Run tests (Bun native test runner)
bun run split-data       # Process World Bank CSV into split files
bun run analyze-data     # Show data statistics
```

There is no separate linter configured. Tests use `bun:test` — test files live alongside source (e.g., `src/lib/fuzzySearch.test.ts`).

## Architecture

### Server Entry Point

`src/index.tsx` — A Bun HTTP server that serves `index.html` as a catch-all SPA route and exposes a minimal `/api/hello` endpoint. In development, HMR and browser console echoing are enabled.

### Data Flow

The app does **not** bundle data. Instead, ~38,000 pre-split CSV files live in `data/split/` and are fetched at runtime from GitHub raw content URLs:

```
GitHub raw URLs (configured in src/lib/constants.ts)
  → TanStack Query hooks (src/lib/hooks/use-worldbank-data.ts)
    → CSV parsing → typed data → Chart.js visualizations
```

Key metadata files: `_countries.csv`, `_series.csv`, `_index.csv` in `data/split/`.
Filename convention for data: `{country-code}-{series-code}.csv` (lowercase).

### Component Structure

- **DataExplorer** (`src/components/DataExplorer.tsx`) — Main container component owning all state (selected countries, series, chart type, display mode). This is the central orchestration point.
- **CountrySelect / SeriesSelect** — Thin wrappers around MultiSelect/SearchableSelect.
- **Chart components** (`src/components/charts/`) — LineChart, BarChart, PercentageComparisonChart wrapping Chart.js via react-chartjs-2.
- **UI primitives** (`src/components/ui/`) — Shadcn/ui components using Radix UI + CVA + Tailwind.

### State Management

- **UI state**: React `useState` in DataExplorer (no global state library).
- **Server state**: TanStack Query v5 with configured caching (5min GC, 1min stale) in `src/lib/query-client.ts`. Metadata queries use longer cache (1hr stale, 2hr GC).

### Styling

Tailwind CSS v4 with `bun-plugin-tailwind` for builds. Global styles in `src/index.css`. Component variants via `class-variance-authority` (CVA). Utility function `cn()` in `src/lib/utils.ts` merges classes with `clsx` + `tailwind-merge`.

### Build

`build.ts` is a custom Bun build script (not Vite). It scans `src/` for HTML entrypoints, uses `bun-plugin-tailwind`, outputs to `dist/` with minification and sourcemaps.

### Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

## Commit Policy

When closing a GitHub ticket, include `Closes #<ticketNumber>` in the commit message.

## Data Exploration

To explore the World Bank data:
- `data/split/_index.csv` — master index
- `data/split/_series.csv` — series metadata (indicator codes and descriptions)
- `data/split/_countries.csv` — country metadata (codes and names)
