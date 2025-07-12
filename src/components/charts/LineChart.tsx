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
import { Line } from 'react-chartjs-2'
import type { CountrySeriesData } from '@/lib/hooks/use-worldbank-data'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface LineChartProps {
  readonly data: CountrySeriesData[]
  readonly title?: string
  readonly seriesName?: string
}

export function LineChart({ data, title, seriesName }: LineChartProps) {
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
      if (point.value !== null) {
        allYears.add(point.year)
      }
    })
  })
  
  const sortedYears = Array.from(allYears).sort((a, b) => a - b)

  const chartData = {
    labels: sortedYears,
    datasets: data.map((countryData, index) => {
      // Create a value array aligned with sortedYears
      const values = sortedYears.map(year => {
        const point = countryData.data.find(p => p.year === year)
        return point?.value ?? null
      })

      return {
        label: countryData.country.name,
        data: values,
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        tension: 0.1,
        spanGaps: false, // Don't connect points where data is missing
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
        display: !!title,
        text: title || seriesName,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  }

  return <Line data={chartData} options={options} />
}
