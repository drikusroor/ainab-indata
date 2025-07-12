# Optimized World Bank Data Structure

## File Organization

This directory contains World Bank data split into individual CSV files, with optimized metadata structure:

### Data Files

- **Pattern**: `{country-code}-{series-code}.csv`
- **Example**: `arg-nygdppcapkd.csv` (Argentina GDP per capita)
- **Content**: Each file contains yearly data for one country-series combination

### Metadata Files

#### `_countries.csv`

Lookup table for all countries in the dataset:

- **Country Code**: 3-letter ISO country code
- **Country Name**: Full country name

#### `_series.csv`

Lookup table for all data series in the dataset:

- **Series Code**: World Bank series identifier
- **Series Name**: Human-readable description of the data series

#### `_index.csv`

Index of all available country-series combinations:

- **Country Code**: Reference to countries table
- **Series Code**: Reference to series table

## Benefits of This Structure

1. **Space Efficiency**: Eliminates redundant storage of country and series names
2. **Predictable Filenames**: Use `getFilenameFromCodes(countryCode, seriesCode)`
3. **Easy Filtering**: Query specific countries or series from the index
4. **Normalized Data**: Country and series information stored once

## Usage Examples

### Find all series for a country

```bash
grep "^ARG," _index.csv
```

### Find all countries with GDP data

```bash
grep "NY.GDP" _index.csv
```

### Get country name from code

```bash
grep "^ARG," _countries.csv
```

### Generate filename programmatically

```typescript
const filename = `${countryCode.toLowerCase()}-${seriesCode.toLowerCase().replace(/[^a-z0-9]/g, '')}.csv`;
```
