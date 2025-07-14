import { DataExplorer } from "./components/DataExplorer";
import "./index.css";

export function App() {
  return (
    <>
      <div className="container mx-auto p-8 space-y-8">
        {/* Data Explorer Section */}
        <div>
          <h1 className="text-5xl font-bold -mb-3 ml-6 leading-tight">AINAB InData</h1>
          <DataExplorer />
        </div>
      </div>
      {/* Data source credit */}
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
