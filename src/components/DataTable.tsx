import type { CountrySeriesData } from "@/lib/hooks/use-worldbank-data"

interface DataTableProps {
  readonly data: CountrySeriesData[]
}

export function DataTable({ data }: DataTableProps) {
  return (
    <div className="overflow-auto max-h-96">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-2 text-left border-b">Country</th>
            <th className="p-2 text-left border-b">Year</th>
            <th className="p-2 text-left border-b">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map(countryData =>
            countryData.data.map(point => (
              <tr key={countryData.country.code + '-' + point.year} className="border-b">
                <td className="p-2 font-medium">{countryData.country.name}</td>
                <td className="p-2">{point.year}</td>
                <td className="p-2">{point.value !== null ? point.value.toLocaleString() : 'No data'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
