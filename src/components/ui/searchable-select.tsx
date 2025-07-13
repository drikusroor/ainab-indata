import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Option {
  readonly value: string
  readonly label: string
}

interface SearchableSelectProps {
  readonly options: Option[]
  readonly selected: string
  readonly onSelectionChange: (value: string) => void
  readonly placeholder?: string
  readonly className?: string
  readonly disabled?: boolean
}

export function SearchableSelect({
  options,
  selected,
  onSelectionChange,
  placeholder = "Select...",
  className,
  disabled = false
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (value: string) => {
    onSelectionChange(value)
    setOpen(false)
    setSearchTerm('')
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(!open)
    } else if (event.key === 'Escape' && open) {
      setOpen(false)
    }
  }

  const selectedOption = options.find(option => option.value === selected)

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        className={cn("justify-between min-h-10 w-full cursor-pointer", className)}
        disabled={disabled}
        type="button"
        tabIndex={0}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="flex-1 text-left">
          {selectedOption ? (
            <span>{selectedOption.label}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
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
            tabIndex={-1}
          />
          <div 
            className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto"
          >
            <div className="p-2">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring cursor-text"
                onChange={(e) => setSearchTerm(e.target.value)}
                tabIndex={0}
              />
            </div>
            <div className="py-1">
              {filteredOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className="w-full flex items-start px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer focus:outline-none focus:bg-accent focus:text-accent-foreground"
                  onClick={() => handleSelect(option.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelect(option.value)
                    }
                  }}
                  tabIndex={0}
                  aria-selected={selected === option.value}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1 text-left">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
