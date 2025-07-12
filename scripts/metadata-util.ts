#!/usr/bin/env bun

import path from 'path';
import csv from 'csv-parser';
import { createReadStream } from 'fs';

interface Country {
  code: string;
  name: string;
}

interface Series {
  code: string;
  name: string;
}

interface FileIndex {
  countryCode: string;
  seriesCode: string;
}

/**
 * Utility class for working with optimized World Bank metadata
 */
class WorldBankMetadata {
  private readonly countries = new Map<string, Country>();
  private readonly series = new Map<string, Series>();
  private readonly fileIndex: FileIndex[] = [];
  private readonly metadataDir: string;

  constructor(metadataDir: string) {
    this.metadataDir = metadataDir;
  }

  /**
   * Load all metadata files
   */
  async load(): Promise<void> {
    await Promise.all([
      this.loadCountries(),
      this.loadSeries(),
      this.loadIndex()
    ]);
  }

  private async loadCountries(): Promise<void> {
    const countriesPath = path.join(this.metadataDir, '_countries.csv');
    return new Promise((resolve, reject) => {
      createReadStream(countriesPath)
        .pipe(csv())
        .on('data', (row) => {
          if (row['Country Code']?.trim()) {
            this.countries.set(row['Country Code'], {
              code: row['Country Code'],
              name: row['Country Name']
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
  }

  private async loadSeries(): Promise<void> {
    const seriesPath = path.join(this.metadataDir, '_series.csv');
    return new Promise((resolve, reject) => {
      createReadStream(seriesPath)
        .pipe(csv())
        .on('data', (row) => {
          if (row['Series Code']?.trim()) {
            this.series.set(row['Series Code'], {
              code: row['Series Code'],
              name: row['Series Name']
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
  }

  private async loadIndex(): Promise<void> {
    const indexPath = path.join(this.metadataDir, '_index.csv');
    return new Promise((resolve, reject) => {
      createReadStream(indexPath)
        .pipe(csv())
        .on('data', (row) => {
          if (row['Country Code'] && row['Series Code'] && 
              row['Country Code'].trim() && row['Series Code'].trim()) {
            this.fileIndex.push({
              countryCode: row['Country Code'],
              seriesCode: row['Series Code']
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
  }

  /**
   * Get country information by code
   */
  getCountry(countryCode: string): Country | undefined {
    return this.countries.get(countryCode);
  }

  /**
   * Get series information by code
   */
  getSeries(seriesCode: string): Series | undefined {
    return this.series.get(seriesCode);
  }

  /**
   * Generate filename for country-series combination
   */
  getFilename(countryCode: string, seriesCode: string): string {
    const sanitizedCountryCode = countryCode
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/(^-)|(-$)/g, '');
    
    const sanitizedSeriesCode = seriesCode
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/(^-)|(-$)/g, '');
    
    return `${sanitizedCountryCode}-${sanitizedSeriesCode}.csv`;
  }

  /**
   * Find all series for a specific country
   */
  getSeriesForCountry(countryCode: string): Array<{series: Series, filename: string}> {
    return this.fileIndex
      .filter(entry => entry.countryCode === countryCode)
      .map(entry => {
        const series = this.getSeries(entry.seriesCode);
        if (!series) throw new Error(`Series not found: ${entry.seriesCode}`);
        
        return {
          series,
          filename: this.getFilename(countryCode, entry.seriesCode)
        };
      });
  }

  /**
   * Find all countries with a specific series
   */
  getCountriesForSeries(seriesCode: string): Array<{country: Country, filename: string}> {
    return this.fileIndex
      .filter(entry => entry.seriesCode === seriesCode)
      .map(entry => {
        const country = this.getCountry(entry.countryCode);
        if (!country) throw new Error(`Country not found: ${entry.countryCode}`);
        
        return {
          country,
          filename: this.getFilename(entry.countryCode, seriesCode)
        };
      });
  }

  /**
   * Search series by name
   */
  searchSeries(searchTerm: string): Series[] {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return Array.from(this.series.values()).filter(series =>
      series.name.toLowerCase().includes(lowerSearchTerm) ||
      series.code.toLowerCase().includes(lowerSearchTerm)
    );
  }

  /**
   * Search countries by name
   */
  searchCountries(searchTerm: string): Country[] {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return Array.from(this.countries.values()).filter(country =>
      country.name.toLowerCase().includes(lowerSearchTerm) ||
      country.code.toLowerCase().includes(lowerSearchTerm)
    );
  }

  /**
   * Get statistics about the dataset
   */
  getStats() {
    return {
      totalCountries: this.countries.size,
      totalSeries: this.series.size,
      totalFiles: this.fileIndex.length,
      avgSeriesPerCountry: Math.round(this.fileIndex.length / this.countries.size * 10) / 10
    };
  }
}

// CLI usage
async function main() {
  const metadataDir = process.argv[2] || './data/split';
  const command = process.argv[3];
  const searchTerm = process.argv[4];

  try {
    const metadata = new WorldBankMetadata(metadataDir);
    await metadata.load();

    switch (command) {
      case 'stats':
        console.log('Dataset Statistics:');
        console.log(JSON.stringify(metadata.getStats(), null, 2));
        break;

      case 'country': {
        if (!searchTerm) {
          console.error('Please provide a country code or search term');
          process.exit(1);
        }
        
        // Try exact match first
        const country = metadata.getCountry(searchTerm.toUpperCase());
        if (country) {
          console.log(`Country: ${country.name} (${country.code})`);
          const series = metadata.getSeriesForCountry(country.code);
          console.log(`Available series: ${series.length}`);
          series.slice(0, 10).forEach(s => {
            console.log(`  - ${s.series.name} → ${s.filename}`);
          });
          if (series.length > 10) {
            console.log(`  ... and ${series.length - 10} more`);
          }
        } else {
          // Search by name
          const countries = metadata.searchCountries(searchTerm);
          console.log(`Found ${countries.length} countries matching "${searchTerm}":`);
          countries.forEach(c => console.log(`  - ${c.name} (${c.code})`));
        }
        break;
      }

      case 'series': {
        if (!searchTerm) {
          console.error('Please provide a series code or search term');
          process.exit(1);
        }
        
        // Try exact match first
        const series = metadata.getSeries(searchTerm.toUpperCase());
        if (series) {
          console.log(`Series: ${series.name} (${series.code})`);
          const countries = metadata.getCountriesForSeries(series.code);
          console.log(`Available for ${countries.length} countries`);
          countries.slice(0, 10).forEach(c => {
            console.log(`  - ${c.country.name} → ${c.filename}`);
          });
          if (countries.length > 10) {
            console.log(`  ... and ${countries.length - 10} more`);
          }
        } else {
          // Search by name
          const seriesList = metadata.searchSeries(searchTerm);
          console.log(`Found ${seriesList.length} series matching "${searchTerm}":`);
          seriesList.forEach(s => console.log(`  - ${s.name} (${s.code})`));
        }
        break;
      }

      case 'filename': {
        if (!searchTerm) {
          console.error('Please provide country and series codes: country,series');
          process.exit(1);
        }
        
        const [countryCode, seriesCode] = searchTerm.split(',');
        if (!countryCode || !seriesCode) {
          console.error('Please provide both country and series codes: country,series');
          process.exit(1);
        }
        
        const filename = metadata.getFilename(countryCode.trim(), seriesCode.trim());
        console.log(`Filename: ${filename}`);
        break;
      }

      default:
        console.log('World Bank Metadata Utility');
        console.log('');
        console.log('Usage:');
        console.log('  bun metadata-util.ts [metadata-dir] stats');
        console.log('  bun metadata-util.ts [metadata-dir] country <code-or-search>');
        console.log('  bun metadata-util.ts [metadata-dir] series <code-or-search>');
        console.log('  bun metadata-util.ts [metadata-dir] filename <country,series>');
        console.log('');
        console.log('Examples:');
        console.log('  bun metadata-util.ts stats');
        console.log('  bun metadata-util.ts country ARG');
        console.log('  bun metadata-util.ts country "united states"');
        console.log('  bun metadata-util.ts series GDP');
        console.log('  bun metadata-util.ts filename ARG,NY.GDP.PCAP.KD');
        break;
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { WorldBankMetadata };
