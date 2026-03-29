import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CorrelationAnalysis } from '@/components/analysis/CorrelationAnalysis'
import { SimilarityRanking } from '@/components/analysis/SimilarityRanking'
import { TrendAnalysis } from '@/components/analysis/TrendAnalysis'
import { GapminderChart } from '@/components/analysis/GapminderChart'

interface StatisticalAnalysisProps {
  searchTab?: string | null
  searchCountries?: string[] | null
  searchSeries?: string | null
  searchSeriesX?: string | null
  searchSeriesY?: string | null
  onSearchConsumed?: () => void
}

export function StatisticalAnalysis({
  searchTab,
  searchCountries,
  searchSeries,
  searchSeriesX,
  searchSeriesY,
  onSearchConsumed,
}: StatisticalAnalysisProps) {
  const [activeTab, setActiveTab] = useState('gapminder')

  useEffect(() => {
    if (searchTab) {
      setActiveTab(searchTab)
      if (onSearchConsumed) onSearchConsumed()
    }
  }, [searchTab, onSearchConsumed])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistical Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="gapminder">Gapminder</TabsTrigger>
            <TabsTrigger value="correlation">Correlation</TabsTrigger>
            <TabsTrigger value="similarity">Similarity</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="gapminder" className="mt-4">
            <GapminderChart />
          </TabsContent>

          <TabsContent value="correlation" className="mt-4">
            <CorrelationAnalysis
              searchCountries={searchCountries}
              searchSeriesX={searchSeriesX}
              searchSeriesY={searchSeriesY}
            />
          </TabsContent>

          <TabsContent value="similarity" className="mt-4">
            <SimilarityRanking />
          </TabsContent>

          <TabsContent value="trends" className="mt-4">
            <TrendAnalysis />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
