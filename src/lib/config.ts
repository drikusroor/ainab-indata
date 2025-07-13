/**
 * Configuration for default example data in the Data Explorer
 * This allows easy modification of the initial state without hardcoding values
 */

/**
 * Default countries to display when the app loads
 * NLD = Netherlands, DEU = Germany, FRA = France, GBR = United Kingdom
 */
export const DEFAULT_COUNTRIES = ['NLD', 'DEU', 'FRA', 'GBR'] as const

/**
 * Default data series to display when the app loads
 * NY.GDP.PCAP.PP.KD = GDP per capita, PPP (constant 2017 international $)
 */
export const DEFAULT_SERIES = 'NY.GDP.PCAP.PP.KD'

/**
 * Default chart type to display when the app loads
 */
export const DEFAULT_CHART_TYPE = 'line' as const

/**
 * Default comparison year for bar charts
 */
export const DEFAULT_COMPARE_YEAR = 2023

/**
 * Default display mode for the data explorer
 */
export const DEFAULT_DISPLAY_MODE = 'visualization' as const

/**
 * Configuration type for the Data Explorer defaults
 */
export interface DataExplorerConfig {
  readonly defaultCountries: readonly string[]
  readonly defaultSeries: string
  readonly defaultChartType: 'line' | 'bar'
  readonly defaultCompareYear: number
  readonly defaultDisplayMode: 'visualization' | 'table' | 'side-by-side'
}

/**
 * Complete default configuration for the Data Explorer
 */
export const DATA_EXPLORER_CONFIG: DataExplorerConfig = {
  defaultCountries: DEFAULT_COUNTRIES,
  defaultSeries: DEFAULT_SERIES,
  defaultChartType: DEFAULT_CHART_TYPE,
  defaultCompareYear: DEFAULT_COMPARE_YEAR,
  defaultDisplayMode: DEFAULT_DISPLAY_MODE,
} as const