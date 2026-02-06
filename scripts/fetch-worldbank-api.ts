#!/usr/bin/env bun
/**
 * Fetch ALL World Development Indicators (Source 2) from the World Bank API v2
 * and produce CSV files in the exact format the React app expects.
 *
 * Usage: bun run fetch-worldbank [options]
 *
 * Options:
 *   --output-dir <path>       Output directory (default: ./data/split)
 *   --date-range <start:end>  Override year range (default: 1960:{currentYear-1})
 *   --delay <ms>              Delay between indicator fetches (default: 300)
 *   --resume                  Resume from checkpoint (default behavior)
 *   --no-resume               Ignore checkpoint, start fresh
 *   --dry-run                 List indicators without fetching data
 *   --indicators <a,b,c>      Fetch only specific indicator codes (comma-separated)
 */

import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Country {
  iso3: string;
  name: string;
}

interface Indicator {
  id: string;
  name: string;
}

interface DataPoint {
  countryiso3code: string;
  date: string;
  value: number | null;
}

interface Checkpoint {
  completedIndicators: string[];
  startedAt: string;
  dateRange: string;
  apiLastUpdated: string;
  failedIndicators: string[];
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): {
  outputDir: string;
  dateRange: string;
  delay: number;
  resume: boolean;
  dryRun: boolean;
  indicators: string[] | null;
} {
  const args = process.argv.slice(2);
  const currentYear = new Date().getFullYear();

  let outputDir = "./data/split";
  let dateRange = `1960:${currentYear - 1}`;
  let delay = 300;
  let resume = true;
  let dryRun = false;
  let indicators: string[] | null = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--output-dir":
        outputDir = args[++i];
        break;
      case "--date-range":
        dateRange = args[++i];
        break;
      case "--delay":
        delay = parseInt(args[++i], 10);
        break;
      case "--resume":
        resume = true;
        break;
      case "--no-resume":
        resume = false;
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--indicators":
        indicators = args[++i].split(",").map((s) => s.trim());
        break;
    }
  }

  return { outputDir: resolve(outputDir), dateRange, delay, resume, dryRun, indicators };
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const API_BASE = "https://api.worldbank.org/v2";

async function fetchJson(url: string): Promise<any> {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url);

      if (res.status === 429) {
        console.warn("  Rate limited (429). Backing off 30s...");
        await sleep(30_000);
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      return await res.json();
    } catch (err) {
      const backoff = 1000 * Math.pow(2, attempt);
      if (attempt < maxRetries - 1) {
        console.warn(`  Attempt ${attempt + 1} failed: ${err}. Retrying in ${backoff}ms...`);
        await sleep(backoff);
      } else {
        throw err;
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Phase 1: Fetch countries
// ---------------------------------------------------------------------------

async function fetchCountries(): Promise<Map<string, Country>> {
  console.log("Phase 1: Fetching countries...");
  const data = await fetchJson(`${API_BASE}/country?format=json&per_page=400`);
  const countries = new Map<string, Country>();

  if (!Array.isArray(data) || data.length < 2) {
    throw new Error("Unexpected countries API response format");
  }

  for (const entry of data[1]) {
    countries.set(entry.id, {
      iso3: entry.id,
      name: entry.name,
    });
  }

  console.log(`  Found ${countries.size} countries/entities`);
  return countries;
}

// ---------------------------------------------------------------------------
// Phase 2: Fetch indicators (Source 2 = WDI)
// ---------------------------------------------------------------------------

async function fetchIndicators(): Promise<Indicator[]> {
  console.log("Phase 2: Fetching WDI indicators (Source 2)...");

  const allIndicators: Indicator[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const data = await fetchJson(
      `${API_BASE}/source/2/indicator?format=json&per_page=2000&page=${page}`
    );
    if (!Array.isArray(data) || data.length < 2) {
      throw new Error("Unexpected indicators API response format");
    }
    totalPages = data[0].pages;

    for (const entry of data[1]) {
      allIndicators.push({ id: entry.id, name: entry.name });
    }
    page++;
  } while (page <= totalPages);

  allIndicators.sort((a, b) => a.id.localeCompare(b.id));
  console.log(`  Found ${allIndicators.length} indicators`);
  return allIndicators;
}

// ---------------------------------------------------------------------------
// Phase 3: Checkpoint management
// ---------------------------------------------------------------------------

function checkpointPath(outputDir: string): string {
  return join(outputDir, ".fetch-checkpoint.json");
}

async function loadCheckpoint(outputDir: string): Promise<Checkpoint | null> {
  const path = checkpointPath(outputDir);
  if (!existsSync(path)) return null;
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as Checkpoint;
  } catch {
    return null;
  }
}

async function saveCheckpoint(outputDir: string, checkpoint: Checkpoint): Promise<void> {
  await writeFile(checkpointPath(outputDir), JSON.stringify(checkpoint, null, 2));
}

async function deleteCheckpoint(outputDir: string): Promise<void> {
  const path = checkpointPath(outputDir);
  if (existsSync(path)) {
    await unlink(path);
  }
}

// ---------------------------------------------------------------------------
// Filename generation (matches src/lib/hooks/use-worldbank-data.ts:50)
// ---------------------------------------------------------------------------

function getFilename(countryCode: string, seriesCode: string): string {
  return `${countryCode.toLowerCase()}-${seriesCode.toLowerCase().replace(/[^a-z0-9]/g, "")}.csv`;
}

// ---------------------------------------------------------------------------
// CSV value quoting
// ---------------------------------------------------------------------------

function csvQuote(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Phase 4: Fetch data for a single indicator
// ---------------------------------------------------------------------------

async function fetchIndicatorData(
  indicatorId: string,
  dateRange: string,
  outputDir: string,
  startYear: number,
  endYear: number,
): Promise<{
  countriesWithData: Set<string>;
  error: string | null;
}> {
  const result = { countriesWithData: new Set<string>(), error: null as string | null };

  try {
    // Fetch all data points (paginated)
    const allDataPoints: DataPoint[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const data = await fetchJson(
        `${API_BASE}/country/all/indicator/${indicatorId}?format=json&date=${dateRange}&per_page=15000&page=${page}`
      );

      if (!Array.isArray(data) || data.length < 2 || !data[1]) {
        // No data for this indicator
        return result;
      }

      totalPages = data[0].pages;

      for (const entry of data[1]) {
        allDataPoints.push({
          countryiso3code: entry.countryiso3code,
          date: entry.date,
          value: entry.value,
        });
      }
      page++;
    } while (page <= totalPages);

    // Group by country
    const byCountry = new Map<string, Map<string, number | null>>();
    for (const dp of allDataPoints) {
      if (!dp.countryiso3code) continue;
      if (!byCountry.has(dp.countryiso3code)) {
        byCountry.set(dp.countryiso3code, new Map());
      }
      byCountry.get(dp.countryiso3code)!.set(dp.date, dp.value);
    }

    // Write CSV for each country that has at least one non-null value
    for (const [countryCode, yearValues] of byCountry) {
      const hasAnyValue = Array.from(yearValues.values()).some((v) => v !== null);
      if (!hasAnyValue) continue;

      const lines: string[] = ["Year,Value"];
      for (let year = startYear; year <= endYear; year++) {
        const val = yearValues.get(String(year));
        lines.push(`${year},${val !== null && val !== undefined ? val : ".."}`);
      }

      const filename = getFilename(countryCode, indicatorId);
      await writeFile(join(outputDir, filename), lines.join("\n") + "\n");
      result.countriesWithData.add(countryCode);
    }
  } catch (err: any) {
    result.error = err.message || String(err);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Phase 5: Write metadata files
// ---------------------------------------------------------------------------

async function writeMetadataFiles(
  outputDir: string,
  countries: Map<string, Country>,
  indicators: Indicator[],
  indexEntries: Array<{ countryCode: string; seriesCode: string }>,
  apiLastUpdated: string,
): Promise<void> {
  console.log("\nPhase 5: Writing metadata files...");

  // Determine which countries and indicators actually have data
  const countriesWithData = new Set(indexEntries.map((e) => e.countryCode));
  const indicatorsWithData = new Set(indexEntries.map((e) => e.seriesCode));

  // _countries.csv
  const countryRows = Array.from(countriesWithData)
    .sort()
    .filter((code) => countries.has(code))
    .map((code) => `${code},${csvQuote(countries.get(code)!.name)}`);

  const countriesCsv = [
    "Country Code,Country Name",
    `,Last Updated: ${apiLastUpdated}`,
    ...countryRows,
  ].join("\n") + "\n";
  await writeFile(join(outputDir, "_countries.csv"), countriesCsv);
  console.log(`  _countries.csv: ${countryRows.length} countries`);

  // _series.csv
  const seriesRows = indicators
    .filter((ind) => indicatorsWithData.has(ind.id))
    .map((ind) => `${ind.id},${csvQuote(ind.name)}`);

  const seriesCsv = [
    "Series Code,Series Name",
    ",",
    ...seriesRows,
  ].join("\n") + "\n";
  await writeFile(join(outputDir, "_series.csv"), seriesCsv);
  console.log(`  _series.csv: ${seriesRows.length} indicators`);

  // _index.csv
  const sortedIndex = [...indexEntries].sort((a, b) =>
    a.countryCode === b.countryCode
      ? a.seriesCode.localeCompare(b.seriesCode)
      : a.countryCode.localeCompare(b.countryCode)
  );

  const indexCsv = [
    "Country Code,Series Code",
    ",",
    ...sortedIndex.map((e) => `${e.countryCode},${e.seriesCode}`),
  ].join("\n") + "\n";
  await writeFile(join(outputDir, "_index.csv"), indexCsv);
  console.log(`  _index.csv: ${sortedIndex.length} entries`);

  // _README.md
  const readme = `# Optimized World Bank Data Structure

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

### Find all series for a country

\`\`\`bash
grep "^ARG," _index.csv
\`\`\`

### Find all countries with GDP data

\`\`\`bash
grep "NY.GDP" _index.csv
\`\`\`

### Get country name from code

\`\`\`bash
grep "^ARG," _countries.csv
\`\`\`

### Generate filename programmatically

\`\`\`typescript
const filename = \`\${countryCode.toLowerCase()}-\${seriesCode.toLowerCase().replace(/[^a-z0-9]/g, '')}.csv\`;
\`\`\`
`;
  await writeFile(join(outputDir, "_README.md"), readme);
  console.log("  _README.md: written");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseArgs();
  const [startYearStr, endYearStr] = opts.dateRange.split(":");
  const startYear = parseInt(startYearStr, 10);
  const endYear = parseInt(endYearStr, 10);

  console.log("World Bank Data Fetcher");
  console.log("=======================");
  console.log(`Output directory: ${opts.outputDir}`);
  console.log(`Date range: ${startYear} - ${endYear}`);
  console.log(`Delay between indicators: ${opts.delay}ms`);
  console.log(`Resume: ${opts.resume}`);
  console.log(`Dry run: ${opts.dryRun}`);
  if (opts.indicators) {
    console.log(`Specific indicators: ${opts.indicators.join(", ")}`);
  }
  console.log();

  // Ensure output directory exists
  if (!existsSync(opts.outputDir)) {
    mkdirSync(opts.outputDir, { recursive: true });
  }

  // Phase 1 & 2: Fetch countries and indicators in sequence
  const countries = await fetchCountries();
  const allIndicators = await fetchIndicators();

  // Get API last-updated date from the countries response
  let apiLastUpdated = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  try {
    const metaData = await fetchJson(`${API_BASE}/country?format=json&per_page=1`);
    if (metaData?.[0]?.lastupdated) {
      apiLastUpdated = metaData[0].lastupdated;
    }
  } catch {
    // Use default date
  }

  // Filter indicators if --indicators flag was provided
  let indicators = allIndicators;
  if (opts.indicators) {
    const requested = new Set(opts.indicators);
    indicators = allIndicators.filter((ind) => requested.has(ind.id));
    if (indicators.length === 0) {
      console.error("Error: None of the specified indicators were found in Source 2.");
      console.error("Available indicators are listed with --dry-run.");
      process.exit(1);
    }
    console.log(`\nFiltered to ${indicators.length} of ${allIndicators.length} indicators`);
  }

  // Dry run: just list indicators
  if (opts.dryRun) {
    console.log(`\n--- Dry Run: ${indicators.length} indicators ---\n`);
    for (const ind of indicators) {
      console.log(`  ${ind.id}  ${ind.name}`);
    }
    console.log(`\nTotal: ${indicators.length} indicators`);
    console.log(`Estimated API calls: ~${indicators.length * 2 + 2}`);
    return;
  }

  // Phase 3: Load checkpoint
  let checkpoint: Checkpoint | null = null;
  if (opts.resume) {
    checkpoint = await loadCheckpoint(opts.outputDir);
    if (checkpoint) {
      console.log(
        `\nResuming from checkpoint (${checkpoint.completedIndicators.length} indicators already done)`
      );
    }
  }

  const completedSet = new Set(checkpoint?.completedIndicators ?? []);
  const failedIndicators: string[] = [...(checkpoint?.failedIndicators ?? [])];

  // Track all index entries (including from previous runs via checkpoint)
  const indexEntries: Array<{ countryCode: string; seriesCode: string }> = [];

  // Phase 4: Main loop
  const startTime = Date.now();
  let processed = 0;
  let skipped = 0;
  let filesWritten = 0;

  console.log(`\nPhase 4: Fetching data for ${indicators.length} indicators...\n`);

  for (let i = 0; i < indicators.length; i++) {
    const indicator = indicators[i];

    if (completedSet.has(indicator.id)) {
      skipped++;
      continue;
    }

    const progress = `[${i + 1}/${indicators.length}]`;
    process.stdout.write(`${progress} ${indicator.id} ... `);

    const result = await fetchIndicatorData(
      indicator.id,
      opts.dateRange,
      opts.outputDir,
      startYear,
      endYear,
    );

    if (result.error) {
      console.log(`FAILED: ${result.error}`);
      failedIndicators.push(indicator.id);
    } else {
      const count = result.countriesWithData.size;
      console.log(`${count} countries`);
      filesWritten += count;

      for (const countryCode of result.countriesWithData) {
        indexEntries.push({ countryCode, seriesCode: indicator.id });
      }
    }

    completedSet.add(indicator.id);
    processed++;

    // Save checkpoint
    await saveCheckpoint(opts.outputDir, {
      completedIndicators: Array.from(completedSet),
      startedAt: checkpoint?.startedAt ?? new Date().toISOString(),
      dateRange: opts.dateRange,
      apiLastUpdated,
      failedIndicators,
    });

    // Delay between requests
    if (i < indicators.length - 1) {
      await sleep(opts.delay);
    }
  }

  // For resumed runs, we need to reconstruct index entries for previously completed indicators.
  // Scan the output directory for existing data files matching completed indicators.
  if (skipped > 0) {
    console.log(`\nReconstructing index for ${skipped} previously completed indicators...`);
    const completedBefore = new Set(checkpoint?.completedIndicators ?? []);
    for (const indicator of indicators) {
      if (!completedBefore.has(indicator.id)) continue;
      // Check each country for existing files
      for (const [countryCode] of countries) {
        const filename = getFilename(countryCode, indicator.id);
        if (existsSync(join(opts.outputDir, filename))) {
          indexEntries.push({ countryCode, seriesCode: indicator.id });
        }
      }
    }
  }

  // Phase 5: Write metadata files
  await writeMetadataFiles(opts.outputDir, countries, allIndicators, indexEntries, apiLastUpdated);

  // Phase 6: Cleanup
  await deleteCheckpoint(opts.outputDir);

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log("\n=======================");
  console.log("Summary");
  console.log("=======================");
  console.log(`Indicators processed: ${processed}`);
  console.log(`Indicators skipped (resumed): ${skipped}`);
  console.log(`Files written this run: ${filesWritten}`);
  console.log(`Total index entries: ${indexEntries.length}`);
  console.log(`Time elapsed: ${elapsed} minutes`);

  if (failedIndicators.length > 0) {
    console.log(`\nFailed indicators (${failedIndicators.length}):`);
    for (const id of failedIndicators) {
      console.log(`  ${id}`);
    }
    console.log(`\nRe-run with: bun run fetch-worldbank -- --indicators ${failedIndicators.join(",")}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
