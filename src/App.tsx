import { DataExplorer } from "./components/DataExplorer";
import "./index.css";

export function App() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      {/* Data Explorer Section */}
      <div>
        <h1 className="text-5xl font-bold my-4 leading-tight">AINAB InData</h1>
        <DataExplorer />
      </div>
    </div>
  );
}

export default App;
