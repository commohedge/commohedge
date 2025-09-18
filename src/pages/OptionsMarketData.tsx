import React, { useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { Layout } from '@/components/Layout'

const OptionsMarketData: React.FC = () => {
  useEffect(() => {
    // Reload iframe when component mounts to ensure fresh data
    const iframe = document.getElementById('options-widget') as HTMLIFrameElement
    if (iframe) {
      iframe.src = iframe.src
    }
  }, [])

  const handleRefreshWidget = () => {
    const iframe = document.getElementById('options-widget') as HTMLIFrameElement
    if (iframe) {
      iframe.src = iframe.src
    }
  }

  return (
    <Layout>
      <div className="space-y-4 p-4">
        {/* Compact Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Options Market Data</h1>
            <Badge variant="outline" className="gap-1">
              <Activity className="h-3 w-3" />
              Live Data
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshWidget}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Widget Container */}
        <div className="relative">
          <div className="w-full rounded-lg overflow-hidden border bg-background shadow-sm">
            <iframe 
              id="options-widget"
              width="100%" 
              height="800px" 
              src="https://widget2.sentryd.com/widget/#/5e8770ba-7f1e-4a7f-9cfb-0ffbfdc5e7ba"
              title="Options Market Data Widget"
              frameBorder="0"
              className="w-full"
              style={{ minHeight: '800px' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          
          {/* Attribution Footer */}
          <div className="mt-4 flex justify-end">
            <div className="bg-muted/50 border rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3" />
                <span>Powered by</span>
                <a 
                  href="https://sentryd.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Sentryd
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default OptionsMarketData
