import { MultiSelect } from "@/components/ui/multi-select"

interface CountrySelectProps {
  readonly countryOptions: { value: string; label: string }[]
  readonly selectedCountries: string[]
  readonly onSelectionChange: (countries: string[]) => void
  readonly isLoading: boolean
  readonly error: Error | null
}

export function CountrySelect({ 
  countryOptions, 
  selectedCountries, 
  onSelectionChange, 
  isLoading, 
  error 
}: CountrySelectProps) {
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading countries...</div>
  }

  if (error) {
    return <div className="text-sm text-red-600">Error loading countries: {error.message}</div>
  }

  return (
    <MultiSelect
      options={countryOptions}
      selected={selectedCountries}
      onSelectionChange={onSelectionChange}
      placeholder="Choose countries to compare..."
      disabled={isLoading}
    />
  )
}
