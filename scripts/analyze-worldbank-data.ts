#!/usr/bin/env bun

import csv from 'csv-parser';
import { createReadStream } from 'fs';

interface MetadataRow {
  Filename: string;
  'Country Name': string;
  'Country Code': string;
  'Series Name': string;
  'Series Code': string;
}

/**
 * Analyzes the split World Bank data and provides summary statistics
 */
async function analyzeWorldBankData(metadataFile: string): Promise<void> {
  const countries = new Set<string>();
  const series = new Set<string>();
  
  const countryToSeries = new Map<string, Set<string>>();
  const seriesToCountries = new Map<string, Set<string>>();

  console.log('🔍 Analyzing World Bank dataset...\n');

  return new Promise((resolve, reject) => {
    createReadStream(metadataFile)
      .pipe(csv())
      .on('data', (row: MetadataRow) => {
        const country = row['Country Name'];
        const seriesName = row['Series Name'];

        countries.add(country);
        series.add(seriesName);

        // Track country-to-series relationships
        if (!countryToSeries.has(country)) {
          countryToSeries.set(country, new Set());
        }
        const countrySeriesSet = countryToSeries.get(country);
        if (countrySeriesSet) {
          countrySeriesSet.add(seriesName);
        }

        // Track series-to-countries relationships
        if (!seriesToCountries.has(seriesName)) {
          seriesToCountries.set(seriesName, new Set());
        }
        const seriesCountrySet = seriesToCountries.get(seriesName);
        if (seriesCountrySet) {
          seriesCountrySet.add(country);
        }
      })
      .on('end', () => {
        // Summary statistics
        console.log('📊 Dataset Summary:');
        console.log(`   Total Countries: ${countries.size}`);
        console.log(`   Total Data Series: ${series.size}`);
        console.log(`   Total Combinations: ${countries.size * series.size} (theoretical)`);
        console.log(`   Actual Files: ${countryToSeries.size} countries with varying series\n`);

        // Countries with most data series
        console.log('🌍 Top 10 Countries by Number of Data Series:');
        const countrySeriesCount = Array.from(countryToSeries.entries())
          .map(([country, seriesSet]) => ({ country, count: seriesSet.size }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        countrySeriesCount.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.country}: ${item.count} series`);
        });

        // Most common data series
        console.log('\n📈 Top 10 Most Common Data Series:');
        const seriesCountryCount = Array.from(seriesToCountries.entries())
          .map(([seriesName, countriesSet]) => ({ series: seriesName, count: countriesSet.size }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        seriesCountryCount.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.series}: ${item.count} countries`);
        });

        // Sample countries for quick reference
        console.log('\n🗺️  Sample Countries Available:');
        const sampleCountries = Array.from(countries)
          .sort((a, b) => a.localeCompare(b))
          .slice(0, 15);
        sampleCountries.forEach(country => {
          console.log(`   • ${country}`);
        });

        // Sample data series for quick reference
        console.log('\n📊 Sample Data Series Available:');
        const sampleSeries = Array.from(series)
          .sort((a, b) => a.localeCompare(b))
          .slice(0, 10);
        sampleSeries.forEach(seriesName => {
          console.log(`   • ${seriesName}`);
        });

        console.log('\n✅ Analysis complete! Use this information to build your React app data selectors.');
        resolve();
      })
      .on('error', reject);
  });
}

// Main execution
async function main() {
  const metadataFile = process.argv[2] || './data/split/_metadata.csv';

  try {
    await analyzeWorldBankData(metadataFile);
  } catch (error) {
    console.error('Error analyzing the dataset:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
