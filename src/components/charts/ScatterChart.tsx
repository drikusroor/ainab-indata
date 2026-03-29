import {
  Chart as ChartJS,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Scatter } from 'react-chartjs-2'

ChartJS.register(LinearScale, LogarithmicScale, PointElement, LineElement, Title, Tooltip, Legend)

export type ScaleType = 'linear' | 'logarithmic'

export interface ScatterDataset {
  label: string
  points: { x: number; y: number }[]
}

interface ScatterChartProps {
  datasets: ScatterDataset[]
  xLabel: string
  yLabel: string
  title?: string
  trendLine?: {
    slope: number
    intercept: number
    xMin: number
    xMax: number
  }
  xScaleType?: ScaleType
  yScaleType?: ScaleType
}

const COLORS = [
  'rgb(255, 99, 132)',
  'rgb(54, 162, 235)',
  'rgb(255, 205, 86)',
  'rgb(75, 192, 192)',
  'rgb(153, 102, 255)',
  'rgb(255, 159, 64)',
  'rgb(199, 199, 199)',
  'rgb(83, 102, 147)',
]

export function ScatterChart({
  datasets,
  xLabel,
  yLabel,
  title,
  trendLine,
  xScaleType = 'linear',
  yScaleType = 'linear',
}: ScatterChartProps) {
  const chartDatasets = datasets.map((ds, index) => ({
    label: ds.label,
    data: ds.points,
    backgroundColor: COLORS[index % COLORS.length] + '99',
    borderColor: COLORS[index % COLORS.length],
    pointRadius: 4,
    pointHoverRadius: 6,
  }))

  if (trendLine) {
    chartDatasets.push({
      label: 'Trend',
      data: [
        { x: trendLine.xMin, y: trendLine.slope * trendLine.xMin + trendLine.intercept },
        { x: trendLine.xMax, y: trendLine.slope * trendLine.xMax + trendLine.intercept },
      ],
      borderColor: 'rgba(100, 100, 100, 0.7)',
      backgroundColor: 'transparent',
      borderDash: [6, 4],
      pointRadius: 0,
      pointHoverRadius: 0,
    } as typeof chartDatasets[0])
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: !!title,
        text: title,
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { x: number; y: number } }) => {
            const label = context.dataset.label ?? ''
            const { x, y } = context.parsed
            return `${label}: (${x}, ${y})`
          },
        },
      },
    },
    scales: {
      x: {
        type: xScaleType,
        title: {
          display: true,
          text: xLabel,
        },
      },
      y: {
        type: yScaleType,
        title: {
          display: true,
          text: yLabel,
        },
      },
    },
  }

  return (
    <Scatter
      data={{ datasets: chartDatasets }}
      options={options}
    />
  )
}
