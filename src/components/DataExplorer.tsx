import { useState } from "react"
import { 
  useCountries, 
  useSeries, 
  useMultiCountryData
} from "@/lib/hooks/use-worldbank-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { LineChart } from "@/components/charts/LineChart"
import { BarChart } from "@/components/charts/BarChart"
import { CountrySelect } from "@/components/CountrySelect"
import { SeriesSelect } from "@/components/SeriesSelect"
import { DataTable } from "@/components/DataTable"

/**
 * Enhanced Data Explorer component for multi-country comparison
 * Supports country selection, series selection, and data visualization
 */
export function DataExplorer() {
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['USA', 'CHN', 'DEU'])
  const [selectedSeries, setSelectedSeries] = useState<string>("NY.GDP.MKTP.CD")
  const [chartType, setChartType] = useState<"line" | "bar">("line")
  const [compareYear, setCompareYear] = useState<number>(2023)
  const [displayMode, setDisplayMode] = useState<"visualization" | "table" | "side-by-side">("visualization")

  // Fetch metadata
  const { 
    data: countries, 
    isLoading: countriesLoading, 
    error: countriesError 
  } = useCountries()
  
  const { 
    data: series, 
    isLoading: seriesLoading, 
    error: seriesError 
  } = useSeries()
  
  // Fetch data for selected countries and series
  const { 
    data: multiCountryData, 
    isLoading: dataLoading, 
    error: dataError 
  } = useMultiCountryData(selectedCountries, selectedSeries)

  // Transform data for dropdowns
  const countryOptions = countries?.map(country => ({
    value: country.code,
    label: country.name
  })) || []

  // Sort seriesOptions alphabetically by label
  const seriesOptions = (series?.map(s => ({
    value: s.code,
    label: s.name
  })) || []).sort((a, b) => a.label.localeCompare(b.label))

  // Get available years for comparison
  const availableYears = multiCountryData
    ? Array.from(new Set(
        multiCountryData.flatMap(countryData => 
          countryData.data.map(point => point.year)
        )
      )).sort((a, b) => b - a) // Most recent first
    : []

  const selectedSeriesName = series?.find(s => s.code === selectedSeries)?.name
  const hasData = selectedCountries.length > 0 && selectedSeries && multiCountryData

  const renderDataVisualization = () => {
    if (dataLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-muted-foreground">Loading data...</div>
        </div>
      )
    }

    if (dataError) {
      return <div className="text-sm text-red-600">Error loading data: {dataError.message}</div>
    }

    if (!multiCountryData) {
      return <div className="text-sm text-muted-foreground">No data available</div>
    }

    return (
      <div className="w-full h-96">
        {chartType === "line" ? (
          <LineChart 
            data={multiCountryData} 
            seriesName={selectedSeriesName}
          />
        ) : (
          <BarChart 
            data={multiCountryData} 
            seriesName={selectedSeriesName}
            year={compareYear}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>World Bank Data Explorer</CardTitle>
          <p className="text-sm text-muted-foreground">
            Compare development indicators across multiple countries
          </p>
        </CardHeader>
        <CardContent className="space-y-6 w-full max-w-none p-0">
          {/* Main selectors in responsive grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
            {/* Country Selection */}
            <div className="space-y-2">
              <label htmlFor="country-select" className="text-sm font-medium">
                Select Countries (multiple):
              </label>
              <div id="country-select">
                <CountrySelect
                  countryOptions={countryOptions}
                  selectedCountries={selectedCountries}
                  onSelectionChange={setSelectedCountries}
                  isLoading={countriesLoading}
                  error={countriesError}
                />
              </div>
            </div>

            {/* Series Selection */}
            <div className="space-y-2">
              <label htmlFor="series-select" className="text-sm font-medium">
                Select Data Series:
              </label>
              <div id="series-select">
                <SeriesSelect
                  seriesOptions={seriesOptions}
                  selectedSeries={selectedSeries}
                  onSelectionChange={setSelectedSeries}
                  isLoading={seriesLoading}
                  error={seriesError}
                />
              </div>
            </div>

            {/* Chart Type Selection - always visible for better UX */}
            <div className="space-y-2">
              <label htmlFor="chart-type" className="text-sm font-medium">Chart Type:</label>
              <Select value={chartType} onValueChange={(value: "line" | "bar") => setChartType(value)}>
                <SelectTrigger id="chart-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Chart Options */}
          {hasData && chartType === "bar" && availableYears.length > 0 && (
            <div className="flex justify-start">
              <div className="space-y-2 w-32">
                <label htmlFor="compare-year" className="text-sm font-medium">Compare Year:</label>
                <Select value={compareYear.toString()} onValueChange={(value) => setCompareYear(Number(value))}>
                  <SelectTrigger id="compare-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Visualization and Table */}
      {hasData && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedSeriesName}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Comparing {selectedCountries.length} countries
            </p>
          </CardHeader>
          <CardContent className="w-full max-w-none p-0">
            <Tabs value={displayMode} onValueChange={(value) => setDisplayMode(value as "visualization" | "table" | "side-by-side")}> 
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="visualization">Visualization</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
                <TabsTrigger value="side-by-side">Side-by-Side</TabsTrigger>
              </TabsList>
              
              <TabsContent value="visualization" className="mt-4 w-full">
                <div className="w-full h-96 max-w-none">
                  {renderDataVisualization()}
                </div>
              </TabsContent>
              
              <TabsContent value="table" className="mt-4 w-full">
                {multiCountryData && <DataTable data={multiCountryData} />}
              </TabsContent>
              
              <TabsContent value="side-by-side" className="mt-4 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Visualization</h4>
                    <div className="w-full h-80 max-w-none">
                      {renderDataVisualization()}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Data Table</h4>
                    <div className="max-h-80 overflow-auto w-full">
                      {multiCountryData && <DataTable data={multiCountryData} />}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!hasData && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p className="mb-2">Select countries and a data series to start exploring.</p>
              <p className="text-sm">
                Choose multiple countries to compare their development indicators over time.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
