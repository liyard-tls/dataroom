'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createObjectURL, revokeObjectURL } from '../ViewerFactory'
import { ScrollArea } from '@/components/ui/scroll-area'

// react-pdf uses browser-only APIs (DOMMatrix, canvas) — must be loaded client-side only
const Document = dynamic(() => import('react-pdf').then((m) => m.Document), { ssr: false })
const Page = dynamic(() => import('react-pdf').then((m) => m.Page), { ssr: false })

async function setupPdfWorker() {
  const { pdfjs } = await import('react-pdf')
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

interface PdfViewerProps {
  blob: Blob
}

export function PdfViewer({ blob }: PdfViewerProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setupPdfWorker()
    const objectUrl = createObjectURL(blob)
    setUrl(objectUrl)
    setCurrentPage(1)
    return () => revokeObjectURL(objectUrl)
  }, [blob])

  if (!url) return null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-center gap-3 border-b py-2">
        <Button variant="ghost" size="icon" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
          <ChevronLeft size={16} />
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {numPages}
        </span>
        <Button variant="ghost" size="icon" disabled={currentPage >= numPages} onClick={() => setCurrentPage((p) => p + 1)}>
          <ChevronRight size={16} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex justify-center p-6">
          <Document
            file={url}
            onLoadSuccess={({ numPages }: { numPages: number }) => setNumPages(numPages)}
            loading={
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            }
          >
            <Page pageNumber={currentPage} className="shadow-lg" />
          </Document>
        </div>
      </ScrollArea>
    </div>
  )
}
