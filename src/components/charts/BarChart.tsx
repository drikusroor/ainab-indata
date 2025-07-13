import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import type { CountrySeriesData } from '@/lib/hooks/use-worldbank-data'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface BarChartProps {
  readonly data: CountrySeriesData[]
  readonly title?: string
  readonly seriesName?: string
  readonly year?: number // Specific year to show, or latest available
}

export function BarChart({ data, title, seriesName }: BarChartProps) {
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

  // Each country is a dataset, each year is a label
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
        backgroundColor: colors[index % colors.length] + '80',
        borderColor: colors[index % colors.length],
        borderWidth: 1,
        stack: 'countries',
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
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: false,
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  }

  return <Bar data={chartData} options={options} />
}
