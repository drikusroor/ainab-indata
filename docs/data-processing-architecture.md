# World Bank Data Processing Architecture

## Overview

This document describes the data processing pipeline for the World Bank dataset, which is designed to transform a large monolithic CSV file (22MB+) into smaller, manageable files organized by country and dataset combination.

## Data Structure

### Input Data Format

The original World Bank dataset contains the following structure:

- **Country Name**: Full country name (e.g., "Argentina")
- **Country Code**: ISO 3-letter country code (e.g., "ARG")
- **Series Name**: Human-readable dataset name (e.g., "GDP per capita (constant 2015 US$)")
- **Series Code**: Machine-readable dataset identifier (e.g., "NY.GDP.PCAP.KD")
- **Year Columns**: Data for years 1960-2024 in format "YYYY [YRYYYY]"

### Output Data Format

Each country-dataset combination is split into a separate CSV file with:

- **Year**: Individual year (1960-2024)
- **Value**: The corresponding data value for that year

## File Naming Convention

```sh
{country-code}-{series-code}.csv
```

Where:

- `country-code`: Sanitized, lowercase country code
- `series-code`: Sanitized, lowercase series code with special characters removed

Example: `arg-ny-gdp-pcap-kd.csv` for Argentina's GDP per capita data.

## Architecture Components

### 1. Data Splitting Script (`scripts/split-worldbank-data.ts`)

**Purpose**: Transforms the monolithic World Bank CSV into individual files per country-dataset combination.

**Key Features**:

- **Memory Efficient**: Streams data processing to handle large files
- **Sanitized Filenames**: Removes special characters and ensures filesystem compatibility
- **Progress Tracking**: Real-time progress updates during processing
- **Metadata Generation**: Creates a lookup table for all generated files
- **Error Handling**: Robust error handling and validation

**Functions**:

- `sanitizeFilename()`: Cleans strings for safe filename usage
- `createFilename()`: Generates consistent filename patterns
- `prepareOutputDirectory()`: Sets up output directory structure
- `writeCountryDatasetFile()`: Writes individual CSV files
- `createMetadataFile()`: Generates metadata lookup table
- `splitWorldBankData()`: Main processing function

### 2. Metadata System

**Metadata File**: `_metadata.csv`
Contains mapping information for all generated files:

- Filename
- Country Name
- Country Code
- Series Name
- Series Code

This enables efficient lookup and discovery of available datasets.

## Directory Structure

```
data/
├── split/                          # Generated split files directory
│   ├── _metadata.csv              # Metadata lookup table
│   ├── arg-ny-gdp-pcap-kd.csv     # Argentina GDP per capita
│   ├── arg-ny-gdp-pcap-kd-zg.csv  # Argentina GDP growth rate
│   ├── usa-ny-gdp-pcap-kd.csv     # USA GDP per capita
│   └── ...                        # Additional country-dataset files
└── e3c2f976-..._Data.csv          # Original World Bank dataset
```

## Usage

### Running the Data Splitting Script

```bash
# Using npm script (recommended)
bun run split-data <input-file> [output-directory]

# Direct execution
bun scripts/split-worldbank-data.ts <input-file> [output-directory]
```

**Examples**:

```bash
# Split with default output directory (./data/split)
bun run split-data ./e3c2f976-0246-450e-a948-b5e0dc2c9740_Data.csv

# Split with custom output directory
bun run split-data ./worldbank-data.csv ./data/processed
```

### Expected Output

```
Starting to process ./worldbank-data.csv...
Created output directory: ./data/split
Found 65 year columns from 1960 [YR1960] to 2024 [YR2024]
Processed 1000 rows...
Processed 2000 rows...
...
Finished reading 38310 rows. Creating 15240 individual files...
Created 100/15240 files...
Created 200/15240 files...
...
Created metadata file: ./data/split/_metadata.csv

✅ Successfully split dataset into 15240 files!
📁 Output directory: ./data/split
📊 Metadata file: ./data/split/_metadata.csv
```

## Performance Considerations

- **Memory Usage**: Streaming approach keeps memory usage low regardless of file size
- **File I/O**: Optimized to minimize disk operations
- **Processing Time**: Approximately 2-3 minutes for the full World Bank dataset
- **Storage**: Individual files are much smaller and faster to query

## Future React Application Integration

### Data Loading Strategy

1. **Lazy Loading**: Load country-dataset files only when requested
2. **Metadata First**: Use `_metadata.csv` to populate country/dataset selectors
3. **Caching**: Implement client-side caching for frequently accessed datasets
4. **Search**: Enable search across countries and datasets using metadata

### API Design Considerations

```typescript
// Example API endpoints for the React app
interface DataAPI {
  getAvailableCountries(): Promise<Country[]>;
  getAvailableDatasets(countryCode?: string): Promise<Dataset[]>;
  getCountryData(countryCode: string, seriesCode: string): Promise<YearlyData[]>;
  compareCountries(countryCodes: string[], seriesCode: string): Promise<ComparisonData>;
}
```

### Component Architecture

```
App
├── CountrySelector
├── DatasetSelector
├── DataVisualization
│   ├── LineChart
│   ├── BarChart
│   └── ComparisonView
└── DataTable
```

## Dependencies

- **csv-parser**: Efficient CSV parsing with streaming support
- **csv-writer**: Clean CSV writing with proper escaping
- **fs/promises**: Modern file system operations
- **path**: Cross-platform path handling

## Error Handling

The script includes comprehensive error handling for:

- Missing input files
- Invalid CSV format
- File system permissions
- Memory constraints
- Network issues (if loading remote data)

## Maintenance

### Adding New Data Sources

1. Ensure input CSV follows the same column structure
2. Update the script if different year ranges are needed
3. Test with a small sample first
4. Update documentation as needed

### Performance Optimization

- Monitor file system performance with large datasets
- Consider parallel processing for very large datasets
- Implement compression for storage efficiency if needed

## Security Considerations

- **Filename Sanitization**: Prevents directory traversal attacks
- **Input Validation**: Validates CSV structure before processing  
- **Resource Limits**: Implements safeguards against excessive memory usage
- **Access Control**: Ensure proper file permissions on generated files
