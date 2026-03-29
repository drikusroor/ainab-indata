import { useState, useMemo, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useCountries, useSeries } from '@/lib/hooks/use-worldbank-data'
import { parseQuery, type ParsedQuery } from '@/lib/query-parser'

const VIEW_LABELS: Record<string, string> = {
  explorer: 'Data Explorer',
  correlation: 'Correlation',
  gapminder: 'Gapminder',
  similarity: 'Similarity',
  trends: 'Trends',
}

interface SmartSearchProps {
  onNavigate: (parsed: ParsedQuery) => void
}

export function SmartSearch({ onNavigate }: SmartSearchProps) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: countries } = useCountries()
  const { data: seriesList } = useSeries()

  const countryOptions = useMemo(
    () => (countries ?? []).map(c => ({ value: c.code, label: c.name })),
    [countries]
  )
  const seriesOptions = useMemo(
    () => (seriesList ?? []).map(s => ({ value: s.code, label: s.name })),
    [seriesList]
  )

  const parsed = useMemo(
    () => parseQuery(query, countryOptions, seriesOptions),
    [query, countryOptions, seriesOptions]
  )

  const hasResults = parsed.countries.length > 0 || parsed.series.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (hasResults) {
      onNavigate(parsed)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd+K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const showPreview = isFocused && query.length > 1

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder='Try "fertility rate china netherlands" or "gdp vs life expectancy"...'
            className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-input bg-background/80 backdrop-blur-sm text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+K
          </kbd>
        </div>
      </form>

      {/* Live preview */}
      {showPreview && hasResults && (
        <div className="absolute z-50 w-full mt-1 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3 space-y-2">
          {/* View */}
          {parsed.view && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-16">View</span>
              <span className="text-sm font-medium px-2 py-0.5 bg-primary/10 text-primary rounded">
                {VIEW_LABELS[parsed.view] ?? parsed.view}
              </span>
            </div>
          )}

          {/* Series */}
          {parsed.series.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-16 pt-0.5">
                {parsed.series.length > 1 ? 'Series' : 'Series'}
              </span>
              <div className="flex flex-wrap gap-1">
                {parsed.series.map((s, i) => (
                  <span key={s.code} className="text-sm">
                    {i > 0 && <span className="text-muted-foreground mx-1">vs</span>}
                    <span className="font-medium px-2 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded">
                      {s.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1">
                      ← <span className="italic">{s.matchedToken}</span>
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Countries */}
          {parsed.countries.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-16 pt-0.5">Countries</span>
              <div className="flex flex-wrap gap-1">
                {parsed.countries.map(c => (
                  <span key={c.code} className="text-sm font-medium px-2 py-0.5 bg-green-500/10 text-green-700 dark:text-green-300 rounded">
                    {c.name}
                    <span className="text-[10px] text-muted-foreground ml-1">({c.code})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Enter hint */}
          <div className="flex items-center gap-1 pt-1 border-t border-border/50">
            <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">Enter</kbd>
            <span className="text-[10px] text-muted-foreground">to go</span>
          </div>
        </div>
      )}

      {/* No matches */}
      {showPreview && !hasResults && query.length > 2 && (
        <div className="absolute z-50 w-full mt-1 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3">
          <span className="text-sm text-muted-foreground">No matches found. Try country names or indicator keywords.</span>
        </div>
      )}
    </div>
  )
}
