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

export function BarChart({ data, title, seriesName, year }: BarChartProps) {
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

  // Get data for the specified year or latest available
  const chartData = {
    labels: data.map(countryData => countryData.country.name),
    datasets: [{
      label: year ? `${year}` : 'Latest Available',
      data: data.map(countryData => {
        if (year) {
          // Find data for specific year
          const point = countryData.data.find(p => p.year === year)
          return point?.value ?? null
        } else {
          // Find latest available data
          const sortedData = countryData.data
            .filter(p => p.value !== null)
            .sort((a, b) => b.year - a.year)
          return sortedData[0]?.value ?? null
        }
      }),
      backgroundColor: colors.map((color, index) => color + '80'), // Add transparency
      borderColor: colors,
      borderWidth: 1,
    }]
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
  }

  return <Bar data={chartData} options={options} />
}
