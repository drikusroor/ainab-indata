import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
    <Select value={selectedSeries} onValueChange={onSelectionChange}>
      <SelectTrigger>
        <SelectValue placeholder="Choose a data series..." />
      </SelectTrigger>
      <SelectContent>
        {seriesOptions.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
