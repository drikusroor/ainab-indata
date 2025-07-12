import { useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Option {
  readonly value: string
  readonly label: string
}

interface MultiSelectProps {
  readonly options: Option[]
  readonly selected: string[]
  readonly onSelectionChange: (selected: string[]) => void
  readonly placeholder?: string
  readonly className?: string
  readonly disabled?: boolean
}

export function MultiSelect({
  options,
  selected,
  onSelectionChange,
  placeholder = "Select items...",
  className,
  disabled = false
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onSelectionChange(selected.filter(item => item !== value))
    } else {
      onSelectionChange([...selected, value])
    }
  }

  const handleRemove = (value: string, event: React.MouseEvent) => {
    event.stopPropagation()
    onSelectionChange(selected.filter(item => item !== value))
  }

  const selectedOptions = options.filter(option => selected.includes(option.value))

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        className={cn("justify-between min-h-10 w-full", className)}
        disabled={disabled}
        type="button"
      >
        <div className="flex flex-wrap gap-1 flex-1 text-left">
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedOptions.slice(0, 3).map(option => (
                <span
                  key={option.value}
                  className="inline-flex items-center px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded"
                >
                  {option.label}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={(e) => handleRemove(option.value, e)}
                  />
                </span>
              ))}
              {selectedOptions.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{selectedOptions.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
      </Button>
      
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false)
            }}
            aria-label="Close dropdown"
          />
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
            <div className="p-2">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="py-1">
              {filteredOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className="w-full flex items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  onClick={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
