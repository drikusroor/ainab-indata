# World Bank Data Processing - Metadata Optimization

## Problem

The original metadata file (`_metadata.csv`) generated by the data splitting script was nearly 5MB in size. This large file contained redundant information:

- **38,305 rows** with full country names and series descriptions repeated for each file
- **Redundant data**: Country names like "Argentina" repeated 144 times
- **Inefficient storage**: Series descriptions repeated for each country that has that data

## Solution

The script has been optimized to create a **normalized metadata structure** that eliminates redundancy:

### New Structure
1. **`_countries.csv`** (4.7KB) - Lookup table mapping country codes to names
2. **`_series.csv`** (11.8KB) - Lookup table mapping series codes to descriptions  
3. **`_index.csv`** (842KB) - Simple index of country-series combinations
4. **`_README.md`** - Documentation explaining the structure

### Benefits
- **81.5% space reduction** (from 4.6MB to 859KB total)
- **Predictable filenames** using `{country-code}-{series-code}.csv` pattern
- **Easy querying** and filtering by country or series
- **Normalized data** - no duplication of names/descriptions

## Usage

### Using the Utility Script
```bash
# Get dataset statistics
bun scripts/metadata-util.ts data/split stats

# Find all series for a country
bun scripts/metadata-util.ts data/split country ARG

# Search for GDP-related series
bun scripts/metadata-util.ts data/split series GDP

# Generate filename from codes
bun scripts/metadata-util.ts data/split filename ARG,NY.GDP.PCAP.KD
```

### Manual Queries
```bash
# Find all series for Argentina
grep "^ARG," data/split/_index.csv

# Find all countries with GDP data
grep "NY.GDP" data/split/_index.csv

# Get country name from code
grep "^ARG," data/split/_countries.csv
```

### Programmatic Usage
```typescript
import { WorldBankMetadata } from './scripts/metadata-util.ts';

const metadata = new WorldBankMetadata('./data/split');
await metadata.load();

// Get filename for Argentina GDP per capita
const filename = metadata.getFilename('ARG', 'NY.GDP.PCAP.KD');
// Returns: "arg-nygdppcapkd.csv"

// Find all GDP series for Argentina
const series = metadata.getSeriesForCountry('ARG')
  .filter(s => s.series.name.includes('GDP'));
```

## Migration

To update existing code that uses the old `_metadata.csv`:

1. **Replace direct CSV parsing** with the utility class
2. **Use lookup tables** instead of searching the full metadata
3. **Generate filenames** using the sanitization function instead of storing them

The old monolithic metadata approach is still supported for backwards compatibility, but the new optimized structure is recommended for better performance and storage efficiency.
