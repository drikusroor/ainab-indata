import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CorrelationAnalysis } from '@/components/analysis/CorrelationAnalysis'
import { SimilarityRanking } from '@/components/analysis/SimilarityRanking'
import { TrendAnalysis } from '@/components/analysis/TrendAnalysis'

export function StatisticalAnalysis() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistical Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="correlation">
          <TabsList>
            <TabsTrigger value="correlation">Correlation</TabsTrigger>
            <TabsTrigger value="similarity">Similarity</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="correlation" className="mt-4">
            <CorrelationAnalysis />
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
