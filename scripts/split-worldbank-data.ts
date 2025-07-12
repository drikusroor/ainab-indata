#!/usr/bin/env bun

import fs from 'fs/promises';
import path from 'path';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import { createObjectCsvWriter } from 'csv-writer';

interface WorldBankRow {
  'Country Name': string;
  'Country Code': string;
  'Series Name': string;
  'Series Code': string;
  [year: string]: string | undefined;
}

interface ProcessedRow {
  countryName: string;
  countryCode: string;
  seriesName: string;
  seriesCode: string;
  yearlyData: { [year: string]: string | undefined };
}

/**
 * Sanitizes a string to be safe for use as a filename
 * Removes special characters and replaces spaces with hyphens
 */
function sanitizeFilename(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/(^-)|(-$)/g, ''); // Remove leading/trailing hyphens
}

/**
 * Creates a consistent filename pattern for country-dataset combination
 */
function createFilename(countryCode: string, seriesCode: string): string {
  const sanitizedCountryCode = sanitizeFilename(countryCode);
  const sanitizedSeriesCode = sanitizeFilename(seriesCode);
  return `${sanitizedCountryCode}-${sanitizedSeriesCode}.csv`;
}

/**
 * Generates the expected filename for a given country code and series code
 * This function can be used to reconstruct filenames from the optimized metadata
 */
function getFilenameFromCodes(countryCode: string, seriesCode: string): string {
  return createFilename(countryCode, seriesCode);
}

/**
 * Prepares the output directory structure
 */
async function prepareOutputDirectory(outputDir: string): Promise<void> {
  try {
    await fs.access(outputDir);
  } catch {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }
}

/**
 * Writes a single country-dataset combination to a CSV file
 */
async function writeCountryDatasetFile(
  outputDir: string,
  countryCode: string,
  seriesCode: string,
  data: ProcessedRow,
  yearColumns: string[]
): Promise<void> {
  const filename = createFilename(countryCode, seriesCode);
  const filepath = path.join(outputDir, filename);

  // Prepare the header row
  const headers = [
    { id: 'year', title: 'Year' },
    { id: 'value', title: 'Value' }
  ];

  // Prepare the data rows (transform from wide to long format)
  const yearPattern = /\d{4}/;
  const records = yearColumns
    .map(yearCol => {
      const yearMatch = yearPattern.exec(yearCol);
      const year = yearMatch ? yearMatch[0] : null;
      const value = data.yearlyData[yearCol];
      return year ? { year, value: value || '' } : null;
    })
    .filter(record => record !== null);

  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: headers
  });

  await csvWriter.writeRecords(records);
}

/**
 * Creates optimized metadata files with normalized structure
 */
async function createOptimizedMetadataFiles(
  outputDir: string,
  processedData: Map<string, ProcessedRow>
): Promise<void> {
  // Create countries lookup table
  const countriesPath = path.join(outputDir, '_countries.csv');
  const seriesPath = path.join(outputDir, '_series.csv');
  const indexPath = path.join(outputDir, '_index.csv');
  
  // Extract unique countries and series
  const countriesMap = new Map<string, { name: string; code: string }>();
  const seriesMap = new Map<string, { name: string; code: string }>();
  const fileIndex: { countryCode: string; seriesCode: string }[] = [];

  Array.from(processedData.values()).forEach(data => {
    countriesMap.set(data.countryCode, {
      name: data.countryName,
      code: data.countryCode
    });
    seriesMap.set(data.seriesCode, {
      name: data.seriesName,
      code: data.seriesCode
    });
    fileIndex.push({
      countryCode: data.countryCode,
      seriesCode: data.seriesCode
    });
  });

  // Write countries file
  const countriesWriter = createObjectCsvWriter({
    path: countriesPath,
    header: [
      { id: 'code', title: 'Country Code' },
      { id: 'name', title: 'Country Name' }
    ]
  });
  
  const countriesRecords = Array.from(countriesMap.values())
    .sort((a, b) => a.code.localeCompare(b.code));
  await countriesWriter.writeRecords(countriesRecords);

  // Write series file
  const seriesWriter = createObjectCsvWriter({
    path: seriesPath,
    header: [
      { id: 'code', title: 'Series Code' },
      { id: 'name', title: 'Series Name' }
    ]
  });
  
  const seriesRecords = Array.from(seriesMap.values())
    .sort((a, b) => a.code.localeCompare(b.code));
  await seriesWriter.writeRecords(seriesRecords);

  // Write index file (just country-series combinations)
  const indexWriter = createObjectCsvWriter({
    path: indexPath,
    header: [
      { id: 'countryCode', title: 'Country Code' },
      { id: 'seriesCode', title: 'Series Code' }
    ]
  });
  
  const sortedIndex = [...fileIndex].sort((a, b) => 
    a.countryCode.localeCompare(b.countryCode) || a.seriesCode.localeCompare(b.seriesCode)
  );
  await indexWriter.writeRecords(sortedIndex);

  console.log(`Created optimized metadata files:`);
  console.log(`📊 Countries lookup: ${countriesPath} (${countriesRecords.length} entries)`);
  console.log(`📊 Series lookup: ${seriesPath} (${seriesRecords.length} entries)`);
  console.log(`📊 File index: ${indexPath} (${fileIndex.length} entries)`);
  
  // Calculate space savings
  const originalSize = fileIndex.length * (50 + 50 + 100 + 50); // Rough estimate of original row size
  const newSize = countriesRecords.length * 100 + seriesRecords.length * 150 + fileIndex.length * 20;
  const savingsPercent = Math.round((1 - newSize / originalSize) * 100);
  console.log(`💾 Estimated space savings: ${savingsPercent}%`);

  // Create a README file explaining the optimized structure
  const readmePath = path.join(outputDir, '_README.md');
  const readmeContent = `# Optimized World Bank Data Structure

## File Organization

This directory contains World Bank data split into individual CSV files, with optimized metadata structure:

### Data Files
- **Pattern**: \`{country-code}-{series-code}.csv\`
- **Example**: \`arg-nygdppcapkd.csv\` (Argentina GDP per capita)
- **Content**: Each file contains yearly data for one country-series combination

### Metadata Files

#### \`_countries.csv\`
Lookup table for all countries in the dataset:
- **Country Code**: 3-letter ISO country code
- **Country Name**: Full country name

#### \`_series.csv\`
Lookup table for all data series in the dataset:
- **Series Code**: World Bank series identifier
- **Series Name**: Human-readable description of the data series

#### \`_index.csv\`
Index of all available country-series combinations:
- **Country Code**: Reference to countries table
- **Series Code**: Reference to series table

## Benefits of This Structure

1. **Space Efficiency**: Eliminates redundant storage of country and series names
2. **Predictable Filenames**: Use \`getFilenameFromCodes(countryCode, seriesCode)\`
3. **Easy Filtering**: Query specific countries or series from the index
4. **Normalized Data**: Country and series information stored once

## Usage Examples

### Find all series for a country:
\`\`\`bash
grep "^ARG," _index.csv
\`\`\`

### Find all countries with GDP data:
\`\`\`bash
grep "NY.GDP" _index.csv
\`\`\`

### Get country name from code:
\`\`\`bash
grep "^ARG," _countries.csv
\`\`\`

### Generate filename programmatically:
\`\`\`typescript
const filename = \`\${countryCode.toLowerCase()}-\${seriesCode.toLowerCase().replace(/[^a-z0-9]/g, '')}.csv\`;
\`\`\`
`;

  await fs.writeFile(readmePath, readmeContent, 'utf8');
  console.log(`📖 Created documentation: ${readmePath}`);
}

/**
 * Main function to split the World Bank dataset
 */
async function splitWorldBankData(inputFile: string, outputDir: string): Promise<void> {
  console.log(`Starting to process ${inputFile}...`);
  
  await prepareOutputDirectory(outputDir);

  const processedData = new Map<string, ProcessedRow>();
  const yearColumns: string[] = [];
  let rowCount = 0;

  return new Promise((resolve, reject) => {
    createReadStream(inputFile)
      .pipe(csv())
      .on('headers', (headers: string[]) => {
        // Extract year columns (they follow the pattern like "1960 [YR1960]")
        const yearPattern = /\d{4} \[YR\d{4}\]/;
        yearColumns.push(...headers.filter(header => yearPattern.test(header)));
        console.log(`Found ${yearColumns.length} year columns from ${headers[4]} to ${headers[headers.length - 1]}`);
      })
      .on('data', (row: WorldBankRow) => {
        rowCount++;
        if (rowCount % 1000 === 0) {
          console.log(`Processed ${rowCount} rows...`);
        }

        const key = `${row['Country Code']}-${row['Series Code']}`;
        
        // Extract yearly data
        const yearlyData: { [year: string]: string | undefined } = {};
        yearColumns.forEach(yearCol => {
          yearlyData[yearCol] = row[yearCol];
        });

        processedData.set(key, {
          countryName: row['Country Name'],
          countryCode: row['Country Code'],
          seriesName: row['Series Name'],
          seriesCode: row['Series Code'],
          yearlyData
        });
      })
      .on('end', async () => {
        console.log(`Finished reading ${rowCount} rows. Creating ${processedData.size} individual files...`);

        let fileCount = 0;
        for (const [, data] of Array.from(processedData.entries())) {
          await writeCountryDatasetFile(
            outputDir,
            data.countryCode,
            data.seriesCode,
            data,
            yearColumns
          );
          
          fileCount++;
          if (fileCount % 100 === 0) {
            console.log(`Created ${fileCount}/${processedData.size} files...`);
          }
        }

        await createOptimizedMetadataFiles(outputDir, processedData);

        console.log(`\n✅ Successfully split dataset into ${fileCount} files!`);
        console.log(`📁 Output directory: ${outputDir}`);
        console.log(`📊 Metadata file: ${path.join(outputDir, '_metadata.csv')}`);
        resolve();
      })
      .on('error', reject);
  });
}

// Main execution
async function main() {
  const inputFile = process.argv[2];
  const outputDir = process.argv[3] || './data/split';

  if (!inputFile) {
    console.error('Usage: bun scripts/split-worldbank-data.ts <input-csv-file> [output-directory]');
    console.error('Example: bun scripts/split-worldbank-data.ts ./worldbank-data.csv ./data/split');
    process.exit(1);
  }

  try {
    await splitWorldBankData(inputFile, outputDir);
  } catch (error) {
    console.error('Error processing the dataset:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
