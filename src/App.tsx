import { DataExplorer } from "./components/DataExplorer";
import { StatisticalAnalysis } from "./components/StatisticalAnalysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "./index.css";

export function App() {
  return (
    <>
      <div className="container mx-auto p-8 space-y-8">
        <h1 className="text-5xl font-bold leading-tight ml-6" style={{ fontFamily: "'Baloo 2', cursive" }}>AINAB InData</h1>
        <Tabs defaultValue="explorer">
          <TabsList>
            <TabsTrigger value="explorer">Data Explorer</TabsTrigger>
            <TabsTrigger value="analysis">Statistical Analysis</TabsTrigger>
          </TabsList>
          <TabsContent value="explorer">
            <DataExplorer />
          </TabsContent>
          <TabsContent value="analysis" className="mt-4">
            <StatisticalAnalysis />
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
