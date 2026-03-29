import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

export interface StatEntry {
  label: string
  value: string | number
  color?: string
}

interface StatsCardProps {
  title: string
  stats: StatEntry[]
  accentColor?: string
  className?: string
}

export function StatsCard({ title, stats, accentColor, className }: StatsCardProps) {
  return (
    <Card
      className={cn(className)}
      style={accentColor ? { borderLeft: `4px solid ${accentColor}` } : undefined}
    >
      <CardContent className="pt-4">
        <h3
          className="text-sm font-semibold mb-3"
          style={accentColor ? { color: accentColor } : undefined}
        >
          {title}
        </h3>
        <dl className="space-y-1.5">
          {stats.map((stat, index) => (
            <div key={index} className="flex justify-between items-baseline gap-4">
              <dt className="text-sm text-muted-foreground truncate">{stat.label}</dt>
              <dd
                className="text-sm font-medium tabular-nums shrink-0"
                style={stat.color ? { color: stat.color } : undefined}
              >
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
