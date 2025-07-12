import type { CountrySeriesData } from "@/lib/hooks/use-worldbank-data"

interface DataTableProps {
  readonly data: CountrySeriesData[]
}

export function DataTable({ data }: DataTableProps) {
  return (
    <div className="overflow-auto max-h-64">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-2 text-left border-b">Country</th>
            <th className="p-2 text-left border-b">Latest Value</th>
            <th className="p-2 text-left border-b">Latest Year</th>
            <th className="p-2 text-left border-b">Data Points</th>
          </tr>
        </thead>
        <tbody>
          {data.map(countryData => {
            const validData = countryData.data.filter(point => point.value !== null)
            const sortedData = [...validData].sort((a, b) => b.year - a.year)
            const latestData = sortedData[0]
            
            return (
              <tr key={countryData.country.code} className="border-b">
                <td className="p-2 font-medium">{countryData.country.name}</td>
                <td className="p-2">
                  {latestData?.value?.toLocaleString() || 'No data'}
                </td>
                <td className="p-2">{latestData?.year || 'N/A'}</td>
                <td className="p-2">{validData.length} years</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
