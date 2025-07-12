import { SearchableSelect } from "@/components/ui/searchable-select"

interface SeriesSelectProps {
  readonly seriesOptions: { value: string; label: string }[]
  readonly selectedSeries: string
  readonly onSelectionChange: (series: string) => void
  readonly isLoading: boolean
  readonly error: Error | null
}

export function SeriesSelect({ 
  seriesOptions, 
  selectedSeries, 
  onSelectionChange, 
  isLoading, 
  error 
}: SeriesSelectProps) {
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading data series...</div>
  }

  if (error) {
    return <div className="text-sm text-red-600">Error loading series: {error.message}</div>
  }

  return (
    <SearchableSelect
      options={seriesOptions}
      selected={selectedSeries}
      onSelectionChange={onSelectionChange}
      placeholder="Choose a data series..."
      disabled={isLoading}
    />
  )
}
