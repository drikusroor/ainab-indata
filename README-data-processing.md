# World Bank Data Processing System

## Quick Start

This system processes the large World Bank dataset (22MB CSV) into manageable individual files for efficient querying in a React application.

### 1. Split the Data

```bash
# Split your World Bank CSV file
bun run split-data ./your-worldbank-file.csv ./data/split
```

### 2. Analyze the Results

```bash
# Get overview of available countries and datasets
bun run analyze-data
```

## What Gets Created

After processing, you'll have:

- **38,305 individual CSV files** - One per country-dataset combination
- **1 metadata file** (`_metadata.csv`) - Lookup table for all files
- **Clean file naming** - `{country-code}-{series-code}.csv` format

## File Structure

```text
data/split/
├── _metadata.csv              # Master lookup table
├── arg-nygdppcapkd.csv        # Argentina GDP per capita
├── usa-nygdppcapkd.csv        # USA GDP per capita
├── chn-nygdppcapkd.csv        # China GDP per capita
└── ... (38,302 more files)
```

## Data Format

Each country-dataset file contains:

```csv
Year,Value
1960,7397.10965495682
1961,7670.59545571641
1962,7480.27172420174
...
```

## Dataset Overview

- **267 Countries/Regions** - Including individual countries and regional aggregates
- **145 Data Series** - GDP, population, climate, development indicators
- **65 Years** of data (1960-2024)
- **Popular series**: GDP per capita, population, CO2 emissions, life expectancy

## For React Development

### Loading Strategy

1. Use `_metadata.csv` to populate country/dataset selectors
2. Load individual files only when needed
3. Implement caching for frequently accessed data

### Example Usage

```typescript
// Load metadata for selectors
const metadata = await loadCSV('./data/split/_metadata.csv');

// Load specific country data
const argGDP = await loadCSV('./data/split/arg-nygdppcapkd.csv');

// Compare multiple countries
const countries = ['arg', 'usa', 'chn'];
const series = 'nygdppcapkd';
const data = await Promise.all(
  countries.map(country => 
    loadCSV(`./data/split/${country}-${series}.csv`)
  )
);
```

## Scripts Available

- `bun run split-data <input> [output-dir]` - Split large CSV into individual files
- `bun run analyze-data [metadata-file]` - Analyze dataset composition

## Performance Benefits

- **Fast queries** - No need to scan 38K rows for one country's data
- **Small files** - Each file is ~1KB, loads instantly
- **Parallel loading** - Load multiple countries simultaneously
- **Browser friendly** - Small files work well with web apps

## Next Steps for React App

1. Create data loading utilities
2. Build country/dataset selector components  
3. Implement data visualization (charts, tables)
4. Add comparison functionality
5. Consider data caching strategy
