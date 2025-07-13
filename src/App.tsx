import { DataExplorer } from "./components/DataExplorer";
import "./index.css";

export function App() {
  return (
    <>
      <div className="container mx-auto p-8 space-y-8">
        {/* Data Explorer Section */}
        <div>
          <h1 className="text-5xl font-bold my-4 leading-tight">AINAB InData</h1>
          <DataExplorer />
        </div>
      </div>
      {/* Data source credit */}
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        Data source: World Bank –
        <a
          href="https://data.worldbank.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline ml-1"
        >
          https://data.worldbank.org/
        </a>
      </footer>
    </>
  );
}

export default App;
