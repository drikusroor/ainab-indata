import type { PercentageComparisonData } from '@/lib/hooks/use-percentage-comparison'

interface PercentageComparisonTableProps {
  readonly data: PercentageComparisonData[]
  readonly baselineCountryName: string
}

export function PercentageComparisonTable({ 
  data, 
  baselineCountryName 
}: PercentageComparisonTableProps) {
  // Get all unique years across all countries and sort them
  const allYears = new Set<number>()
  data.forEach(countryData => {
    countryData.data.forEach(point => {
      if (point.percentage !== null) {
        allYears.add(point.year)
      }
    })
  })
  
  const sortedYears = Array.from(allYears).sort((a, b) => b - a) // Most recent first

  if (sortedYears.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No data available for comparison
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-border">
        <thead>
          <tr className="bg-muted">
            <th className="border border-border px-4 py-2 text-left">Country</th>
            {sortedYears.map(year => (
              <th key={year} className="border border-border px-4 py-2 text-center min-w-24">
                {year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((countryData) => {
            const isBaseline = countryData.country.name === baselineCountryName
            
            return (
              <tr key={countryData.country.code} className={isBaseline ? "bg-primary/5 font-medium" : ""}>
                <td className="border border-border px-4 py-2">
                  {countryData.country.name}
                  {isBaseline && <span className="text-xs text-muted-foreground ml-2">(Baseline)</span>}
                </td>
                {sortedYears.map(year => {
                  const point = countryData.data.find(p => p.year === year)
                  const percentage = point?.percentage
                  
                  let displayValue = '—'
                  let cellClass = 'text-muted-foreground'
                  
                  if (percentage !== null && percentage !== undefined) {
                    if (isBaseline) {
                      displayValue = '100.0%'
                      cellClass = 'text-foreground font-medium'
                    } else {
                      displayValue = `${percentage.toFixed(1)}%`
                      // Color coding for percentage values
                      if (percentage >= 100) {
                        cellClass = 'text-green-600 font-medium'
                      } else if (percentage >= 75) {
                        cellClass = 'text-blue-600'
                      } else if (percentage >= 50) {
                        cellClass = 'text-orange-600'
                      } else {
                        cellClass = 'text-red-600'
                      }
                    }
                  }
                  
                  return (
                    <td key={year} className={`border border-border px-4 py-2 text-center ${cellClass}`}>
                      {displayValue}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="mt-2 text-xs text-muted-foreground">
        Values shown as percentage of {baselineCountryName}. 
        <span className="text-green-600 ml-2">≥100%</span>
        <span className="text-blue-600 ml-1">75-99%</span>
        <span className="text-orange-600 ml-1">50-74%</span>
        <span className="text-red-600 ml-1">&lt;50%</span>
      </div>
    </div>
  )
}