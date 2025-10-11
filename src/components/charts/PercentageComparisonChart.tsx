import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import type { TooltipItem } from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { PercentageComparisonData } from '@/lib/hooks/use-percentage-comparison'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface PercentageComparisonChartProps {
  readonly data: PercentageComparisonData[]
  readonly baselineCountryName: string
  readonly seriesName?: string
}

export function PercentageComparisonChart({ 
  data, 
  baselineCountryName, 
  seriesName 
}: PercentageComparisonChartProps) {
  // Generate colors for different countries
  const colors = [
    'rgb(255, 99, 132)',
    'rgb(54, 162, 235)',
    'rgb(255, 205, 86)',
    'rgb(75, 192, 192)',
    'rgb(153, 102, 255)',
    'rgb(255, 159, 64)',
    'rgb(199, 199, 199)',
    'rgb(83, 102, 147)',
  ]

  // Get all unique years across all countries
  const allYears = new Set<number>()
  data.forEach(countryData => {
    countryData.data.forEach(point => {
      if (point.percentage !== null) {
        allYears.add(point.year)
      }
    })
  })
  
  const sortedYears = Array.from(allYears).sort((a, b) => a - b)

  const chartData = {
    labels: sortedYears,
    datasets: data.map((countryData, index) => {
      // Create a percentage array aligned with sortedYears
      const percentages = sortedYears.map(year => {
        const point = countryData.data.find(p => p.year === year)
        return point?.percentage ?? null
      })

      // Make baseline country more prominent
      const isBaseline = countryData.country.name === baselineCountryName
      const color = colors[index % colors.length]
      
      return {
        label: isBaseline 
          ? `${countryData.country.name} (Baseline)`
          : `${countryData.country.name}`,
        data: percentages,
        borderColor: color,
        backgroundColor: color + '20',
        borderWidth: isBaseline ? 3 : 2,
        borderDash: isBaseline ? [] : undefined,
        tension: 0.1,
        spanGaps: false,
        pointRadius: isBaseline ? 4 : 3,
        pointHoverRadius: isBaseline ? 6 : 5,
      }
    })
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${seriesName || 'Data'} - Percentage of ${baselineCountryName}`,
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const countryName = context.dataset.label?.replace(' (Baseline)', '') || ''
            const percentage = context.parsed.y
            
            if (percentage === null) return `${countryName}: No data`
            
            if (countryName === baselineCountryName) {
              return `${countryName}: 100.0% (Baseline)`
            }
            
            return `${countryName}: ${percentage.toFixed(1)}% of ${baselineCountryName}`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: `Percentage of ${baselineCountryName} (%)`
        },
        ticks: {
          callback: (value: string | number) => value + '%'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Year'
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  }

  return <Line data={chartData} options={options} />
}