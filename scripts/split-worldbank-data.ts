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
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
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
  const records = yearColumns
    .map(yearCol => {
      const year = yearCol.match(/\d{4}/)?.[0];
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
 * Creates a metadata file with information about all the generated files
 */
async function createMetadataFile(
  outputDir: string,
  processedData: Map<string, ProcessedRow>
): Promise<void> {
  const metadataPath = path.join(outputDir, '_metadata.csv');
  
  const headers = [
    { id: 'filename', title: 'Filename' },
    { id: 'countryName', title: 'Country Name' },
    { id: 'countryCode', title: 'Country Code' },
    { id: 'seriesName', title: 'Series Name' },
    { id: 'seriesCode', title: 'Series Code' }
  ];

  const records = Array.from(processedData.values()).map(data => ({
    filename: createFilename(data.countryCode, data.seriesCode),
    countryName: data.countryName,
    countryCode: data.countryCode,
    seriesName: data.seriesName,
    seriesCode: data.seriesCode
  }));

  const csvWriter = createObjectCsvWriter({
    path: metadataPath,
    header: headers
  });

  await csvWriter.writeRecords(records);
  console.log(`Created metadata file: ${metadataPath}`);
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
        yearColumns.push(...headers.filter(header => header.match(/\d{4} \[YR\d{4}\]/)));
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
        for (const [key, data] of processedData) {
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

        await createMetadataFile(outputDir, processedData);

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
