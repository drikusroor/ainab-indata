export type ScaleType = 'linear' | 'logarithmic'

interface ScaleToggleProps {
  readonly label?: string
  readonly value: ScaleType
  readonly onChange: (value: ScaleType) => void
}

export function ScaleToggle({ label = 'Y Scale', value, onChange }: ScaleToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <div className="flex rounded-md border border-input overflow-hidden text-xs">
        <button
          type="button"
          className={`px-2 py-0.5 cursor-pointer transition-colors ${value === 'linear' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}`}
          onClick={() => onChange('linear')}
        >
          Linear
        </button>
        <button
          type="button"
          className={`px-2 py-0.5 cursor-pointer transition-colors ${value === 'logarithmic' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}`}
          onClick={() => onChange('logarithmic')}
        >
          Log
        </button>
      </div>
    </div>
  )
}
