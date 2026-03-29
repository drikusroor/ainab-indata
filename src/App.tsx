import { useState, useCallback } from "react";
import { DataExplorer } from "./components/DataExplorer";
import { StatisticalAnalysis } from "./components/StatisticalAnalysis";
import { SmartSearch } from "./components/SmartSearch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ParsedQuery } from "@/lib/query-parser";
import "./index.css";

export function App() {
  const [activeTab, setActiveTab] = useState("explorer");

  // State that can be set by the search bar
  const [searchCountries, setSearchCountries] = useState<string[] | null>(null);
  const [searchSeries, setSearchSeries] = useState<string | null>(null);
  const [searchAnalysisTab, setSearchAnalysisTab] = useState<string | null>(null);
  // Correlation-specific
  const [searchSeriesX, setSearchSeriesX] = useState<string | null>(null);
  const [searchSeriesY, setSearchSeriesY] = useState<string | null>(null);

  const handleSearchNavigate = useCallback((parsed: ParsedQuery) => {
    const countries = parsed.countries.map(c => c.code);
    const series = parsed.series;

    if (parsed.view === 'correlation' || (!parsed.view && series.length >= 2)) {
      setActiveTab('analysis');
      setSearchAnalysisTab('correlation');
      if (series.length >= 2) {
        setSearchSeriesX(series[0].code);
        setSearchSeriesY(series[1].code);
      } else if (series.length === 1) {
        setSearchSeriesX(series[0].code);
        setSearchSeriesY(null);
      }
      if (countries.length > 0) setSearchCountries(countries);
    } else if (parsed.view === 'gapminder' || parsed.view === 'similarity' || parsed.view === 'trends') {
      setActiveTab('analysis');
      setSearchAnalysisTab(parsed.view);
      if (countries.length > 0) setSearchCountries(countries);
      if (series.length > 0) setSearchSeries(series[0].code);
    } else {
      // Default: Data Explorer
      setActiveTab('explorer');
      if (countries.length > 0) setSearchCountries(countries);
      if (series.length > 0) setSearchSeries(series[0].code);
    }
  }, []);

  // Clear search state after it's consumed
  const clearSearchState = useCallback(() => {
    setSearchCountries(null);
    setSearchSeries(null);
    setSearchAnalysisTab(null);
    setSearchSeriesX(null);
    setSearchSeriesY(null);
  }, []);

  return (
    <>
      <div className="container mx-auto p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1
            className="text-5xl font-bold leading-tight ml-2 shrink-0"
            style={{ fontFamily: "'Baloo 2', cursive" }}
          >
            AINAB InData
          </h1>
          <div className="flex-1 w-full sm:w-auto">
            <SmartSearch onNavigate={handleSearchNavigate} />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="explorer">Data Explorer</TabsTrigger>
            <TabsTrigger value="analysis">Statistical Analysis</TabsTrigger>
          </TabsList>
          <TabsContent value="explorer">
            <DataExplorer
              searchCountries={searchCountries}
              searchSeries={searchSeries}
              onSearchConsumed={clearSearchState}
            />
          </TabsContent>
          <TabsContent value="analysis" className="mt-4">
            <StatisticalAnalysis
              searchTab={searchAnalysisTab}
              searchCountries={searchCountries}
              searchSeries={searchSeries}
              searchSeriesX={searchSeriesX}
              searchSeriesY={searchSeriesY}
              onSearchConsumed={clearSearchState}
            />
          </TabsContent>
        </Tabs>
      </div>
      <footer className="mt-12 text-center text-sm text-foreground mb-1">
        Data source: World Bank –
        <a
          href="https://data.worldbank.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline ml-1 cursor-pointer hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
        >
          https://data.worldbank.org/
        </a>
      </footer>
    </>
  );
}

export default App;
