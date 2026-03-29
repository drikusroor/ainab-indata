import { useState } from "react";
import {
	useCountries,
	useSeries,
	useMultiCountryData,
} from "@/lib/hooks/use-worldbank-data";
import { usePercentageComparison } from "@/lib/hooks/use-percentage-comparison";
import { DATA_EXPLORER_CONFIG } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, Percent, RotateCcw } from "lucide-react";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { PercentageComparisonChart } from "@/components/charts/PercentageComparisonChart";
import { CountrySelect } from "@/components/CountrySelect";
import { SeriesSelect } from "@/components/SeriesSelect";
import { DataTable } from "@/components/DataTable";
import { PercentageComparisonTable } from "@/components/PercentageComparisonTable";
import { ScaleToggle, type ScaleType } from "@/components/ui/scale-toggle";

/**
 * Enhanced Data Explorer component for multi-country comparison
 * Supports country selection, series selection, and data visualization
 * Uses configurable defaults for initial state
 */
export function DataExplorer() {
	const [selectedCountries, setSelectedCountries] = useState<string[]>([
		...DATA_EXPLORER_CONFIG.defaultCountries,
	]);
	const [selectedSeries, setSelectedSeries] = useState<string>(
		DATA_EXPLORER_CONFIG.defaultSeries,
	);
	const [chartType, setChartType] = useState<"line" | "bar" | "percentage">(
		DATA_EXPLORER_CONFIG.defaultChartType,
	);
	const [compareYear, setCompareYear] = useState<number>(
		DATA_EXPLORER_CONFIG.defaultCompareYear,
	);
	const [displayMode, setDisplayMode] = useState<
		"visualization" | "table" | "side-by-side"
	>(DATA_EXPLORER_CONFIG.defaultDisplayMode);
	const [yScaleType, setYScaleType] = useState<ScaleType>("linear");
	const [baselineCountry, setBaselineCountry] = useState<string>(
		DATA_EXPLORER_CONFIG.defaultCountries[0] || "USA"
	);

	const handleReset = () => {
		setSelectedCountries([...DATA_EXPLORER_CONFIG.defaultCountries]);
		setSelectedSeries(DATA_EXPLORER_CONFIG.defaultSeries);
		setChartType(DATA_EXPLORER_CONFIG.defaultChartType);
		setCompareYear(DATA_EXPLORER_CONFIG.defaultCompareYear);
		setDisplayMode(DATA_EXPLORER_CONFIG.defaultDisplayMode);
		setBaselineCountry(DATA_EXPLORER_CONFIG.defaultCountries[0] || "USA");
		setYScaleType("linear");
	};

	// Fetch metadata
	const {
		data: countries,
		isLoading: countriesLoading,
		error: countriesError,
	} = useCountries();

	const {
		data: series,
		isLoading: seriesLoading,
		error: seriesError,
	} = useSeries();

	// Fetch data for selected countries and series
	const {
		data: multiCountryData,
		isLoading: dataLoading,
		error: dataError,
	} = useMultiCountryData(selectedCountries, selectedSeries);

	// Get percentage comparison data
	const percentageComparisonData = usePercentageComparison(
		multiCountryData,
		baselineCountry
	);

	// Transform data for dropdowns
	const countryOptions =
		countries?.map((country) => ({
			value: country.code,
			label: country.name,
		})) || [];

	// Sort seriesOptions alphabetically by label
	const seriesOptions = (
		series?.map((s) => ({
			value: s.code,
			label: s.name,
		})) || []
	).sort((a, b) => a.label.localeCompare(b.label));

	// Get available years for comparison
	const availableYears = multiCountryData
		? Array.from(
				new Set(
					multiCountryData.flatMap((countryData) =>
						countryData.data.map((point) => point.year),
					),
				),
			).sort((a, b) => b - a) // Most recent first
		: [];

	const selectedSeriesName = series?.find(
		(s) => s.code === selectedSeries,
	)?.name;
	const baselineCountryName = countries?.find(
		(c) => c.code === baselineCountry,
	)?.name || baselineCountry;
	const hasData =
		selectedCountries.length > 0 && selectedSeries && multiCountryData;

	const renderDataVisualization = () => {
		if (dataLoading) {
			return (
				<div className="flex items-center justify-center h-64">
					<div className="text-sm text-muted-foreground">Loading data...</div>
				</div>
			);
		}

		if (dataError) {
			return (
				<div className="text-sm text-red-600">
					Error loading data: {dataError.message}
				</div>
			);
		}

		if (!multiCountryData) {
			return (
				<div className="text-sm text-muted-foreground">No data available</div>
			);
		}

		return (
			<div className="w-full h-96">
				{chartType === "line" ? (
					<LineChart data={multiCountryData} seriesName={selectedSeriesName} yScaleType={yScaleType} />
				) : chartType === "bar" ? (
					<BarChart
						data={multiCountryData}
						seriesName={selectedSeriesName}
						year={compareYear}
						yScaleType={yScaleType}
					/>
				) : (
					<PercentageComparisonChart
						data={percentageComparisonData}
						baselineCountryName={baselineCountryName}
						seriesName={selectedSeriesName}
					/>
				)}
			</div>
		);
	};

	const renderDataTable = () => {
		if (chartType === "percentage") {
			return (
				<PercentageComparisonTable
					data={percentageComparisonData}
					baselineCountryName={baselineCountryName}
				/>
			);
		}
		return multiCountryData && <DataTable data={multiCountryData} />;
	};

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

						{/* Chart Type Selection - button group with icons */}
						<div className="space-y-2">
							<span className="text-sm font-medium">Chart Type:</span>
							<div className="flex gap-1 p-1 bg-muted rounded-lg">
								<Button
									variant={chartType === "line" ? "default" : "ghost"}
									size="sm"
									onClick={() => setChartType("line")}
									className="flex items-center gap-2 flex-1"
								>
									<TrendingUp className="h-4 w-4" />
									Line Chart
								</Button>
								<Button
									variant={chartType === "bar" ? "default" : "ghost"}
									size="sm"
									onClick={() => setChartType("bar")}
									className="flex items-center gap-2 flex-1"
								>
									<BarChart3 className="h-4 w-4" />
									Bar Chart
								</Button>
								<Button
									variant={chartType === "percentage" ? "default" : "ghost"}
									size="sm"
									onClick={() => setChartType("percentage")}
									className="flex items-center gap-2 flex-1"
									title="Compare countries as percentage of baseline"
								>
									<Percent className="h-4 w-4" />
									% Compare
								</Button>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={handleReset}
								className="flex items-center gap-2 w-full"
							>
								<RotateCcw className="h-4 w-4" />
								Reset
							</Button>
						</div>
					</div>

					{/* Additional Chart Options */}
					<div className="px-6 flex flex-wrap gap-6 items-end">
						{hasData && chartType !== "percentage" && (
							<div className="space-y-2">
								<ScaleToggle value={yScaleType} onChange={setYScaleType} />
							</div>
						)}

						{hasData && chartType === "bar" && availableYears.length > 0 && (
							<div className="space-y-2 w-32">
								<label htmlFor="compare-year" className="text-sm font-medium">
									Compare Year:
								</label>
								<Select
									value={compareYear.toString()}
									onValueChange={(value) => setCompareYear(Number(value))}
								>
									<SelectTrigger id="compare-year">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{availableYears.map((year) => (
											<SelectItem key={year} value={year.toString()}>
												{year}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						{hasData && chartType === "percentage" && (
							<div className="space-y-2 w-48">
								<label htmlFor="baseline-country" className="text-sm font-medium">
									Baseline Country:
								</label>
								<Select
									value={baselineCountry}
									onValueChange={setBaselineCountry}
								>
									<SelectTrigger id="baseline-country">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{selectedCountries.map((countryCode) => {
											const country = countries?.find(c => c.code === countryCode);
											return (
												<SelectItem key={countryCode} value={countryCode}>
													{country?.name || countryCode}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
								<p className="text-xs text-muted-foreground">
									Other countries will be shown as % of this country
								</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Data Visualization and Table */}
			{hasData && (
				<Card>
					<CardHeader>
						<CardTitle>
							{chartType === "percentage" 
								? `${selectedSeriesName} - Percentage Comparison` 
								: selectedSeriesName
							}
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							{chartType === "percentage" 
								? `Comparing ${selectedCountries.length} countries relative to ${baselineCountryName}`
								: `Comparing ${selectedCountries.length} countries`
							}
						</p>
					</CardHeader>
					<CardContent className="w-full max-w-none p-3">
						<Tabs
							value={displayMode}
							onValueChange={(value) =>
								setDisplayMode(
									value as "visualization" | "table" | "side-by-side",
								)
							}
						>
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
								{renderDataTable()}
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
											{renderDataTable()}
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
							<p className="mb-2">
								Select countries and a data series to start exploring.
							</p>
							<p className="text-sm">
								Choose multiple countries to compare their development
								indicators over time.
							</p>
							<p className="text-sm mt-2">
								Use <strong>% Compare</strong> mode to see how countries perform 
								relative to a baseline country (e.g., Japan's GDP vs USA over time).
							</p>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
