import { useState } from "react"
import { useAvailableDatasets, useWorldBankData } from "@/lib/hooks/use-worldbank-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Example component demonstrating TanStack Query usage
 * for fetching and displaying World Bank data
 */
export function DataExplorer() {
  const [selectedFile, setSelectedFile] = useState<string>("")
  
  // Fetch available datasets
  const { 
    data: availableFiles, 
    isLoading: filesLoading, 
    error: filesError 
  } = useAvailableDatasets()
  
  // Fetch data for selected file
  const { 
    data: worldBankData, 
    isLoading: dataLoading, 
    error: dataError 
  } = useWorldBankData(selectedFile)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>World Bank Data Explorer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dataset Selection */}
          <div>
            <label htmlFor="dataset-select" className="block text-sm font-medium mb-2">
              Select Dataset:
            </label>
            {filesLoading ? (
              <div className="text-sm text-muted-foreground">Loading available datasets...</div>
            ) : filesError ? (
              <div className="text-sm text-red-600">Error loading datasets: {filesError.message}</div>
            ) : (
              <select
                id="dataset-select"
                className="w-full p-2 border rounded-md"
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
              >
                <option value="">Choose a dataset...</option>
                {availableFiles?.map((filename) => (
                  <option key={filename} value={filename}>
                    {filename}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Data Display */}
          {selectedFile && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Data Preview: {selectedFile}</h3>
              {dataLoading ? (
                <div className="text-sm text-muted-foreground">Loading data...</div>
              ) : dataError ? (
                <div className="text-sm text-red-600">Error loading data: {dataError.message}</div>
              ) : worldBankData ? (
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-muted p-2 text-sm font-medium">
                    {worldBankData.length} rows loaded
                  </div>
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          {worldBankData[0] && Object.keys(worldBankData[0]).map((header) => (
                            <th key={header} className="p-2 text-left border-b">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {worldBankData.slice(0, 10).map((row, index) => (
                          <tr key={index} className="border-b">
                            {Object.values(row).map((value, cellIndex) => (
                              <td key={cellIndex} className="p-2">
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {worldBankData.length > 10 && (
                      <div className="p-2 text-xs text-muted-foreground text-center">
                        ... and {worldBankData.length - 10} more rows
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No data available</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
