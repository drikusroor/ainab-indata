import { useState } from "react"
import type { CountrySeriesData } from "@/lib/hooks/use-worldbank-data"
import { Button } from "@/components/ui/button"

type TableView = "long" | "countries-as-columns" | "years-as-columns"

interface DataTableProps {
  readonly data: CountrySeriesData[]
}

export function DataTable({ data }: DataTableProps) {
  const [view, setView] = useState<TableView>("countries-as-columns")

  // Get all unique years and countries
  const allYears = Array.from(new Set(
    data.flatMap(countryData => 
      countryData.data.map(point => point.year)
    )
  )).sort((a, b) => a - b)

  const allCountries = data.map(countryData => countryData.country)

  // Helper function to get value for a specific country and year
  const getValueForCountryAndYear = (countryCode: string, year: number): number | null => {
    const countryData = data.find(cd => cd.country.code === countryCode)
    const point = countryData?.data.find(p => p.year === year)
    return point?.value ?? null
  }

  // Helper function to format value
  const formatValue = (value: number | null): string => {
    return value !== null ? value.toLocaleString() : '-'
  }

  const renderLongFormat = () => (
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
  )

  const renderCountriesAsColumns = () => {
    // Create data matrix for Years × Countries view
    const dataMatrix = allYears.map(year => {
      const row = { year }
      const values = allCountries.map(country => ({
        code: country.code,
        value: getValueForCountryAndYear(country.code, year)
      }))
      return { ...row, values }
    })

    return (
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-2 text-left border-b">Year</th>
            {allCountries.map(country => (
              <th key={country.code} className="p-2 text-left border-b">{country.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataMatrix.map(row => (
            <tr key={row.year} className="border-b">
              <td className="p-2 font-medium">{row.year}</td>
              {row.values.map(countryValue => (
                <td key={countryValue.code} className="p-2">
                  {formatValue(countryValue.value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  const renderYearsAsColumns = () => {
    // Create data matrix for Countries × Years view
    const dataMatrix = allCountries.map(country => {
      const values = allYears.map(year => ({
        year,
        value: getValueForCountryAndYear(country.code, year)
      }))
      return { country, values }
    })

    return (
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-2 text-left border-b">Country</th>
            {allYears.map(year => (
              <th key={year} className="p-2 text-left border-b">{year}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataMatrix.map(row => (
            <tr key={row.country.code} className="border-b">
              <td className="p-2 font-medium">{row.country.name}</td>
              {row.values.map(yearValue => (
                <td key={yearValue.year} className="p-2">
                  {formatValue(yearValue.value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className="space-y-4">
      {/* Table View Toggle */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={view === "long" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("long")}
        >
          Country, Year, Value
        </Button>
        <Button
          variant={view === "countries-as-columns" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("countries-as-columns")}
        >
          Years × Countries
        </Button>
        <Button
          variant={view === "years-as-columns" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("years-as-columns")}
        >
          Countries × Years
        </Button>
      </div>

      {/* Table Content */}
      <div className="overflow-auto max-h-96">
        {view === "long" && renderLongFormat()}
        {view === "countries-as-columns" && renderCountriesAsColumns()}
        {view === "years-as-columns" && renderYearsAsColumns()}
      </div>
    </div>
  )
}
